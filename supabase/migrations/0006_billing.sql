-- ============================================================================
-- 0006 — Abonnements, quotas et journal de consommation IA
--
-- Les plans et les compteurs existent dès maintenant pour que le gating des
-- fonctions premium soit en place ; l'intégration Stripe (phase 6) ne fera que
-- renseigner les colonnes `stripe_*` et le statut.
-- ============================================================================

create type public.plan_tier as enum ('gratuit', 'pro');
create type public.subscription_status as enum
  ('actif', 'essai', 'en_retard', 'annule');

create table public.subscriptions (
  user_id                uuid primary key references public.profiles (id) on delete cascade,
  plan                   public.plan_tier not null default 'gratuit',
  status                 public.subscription_status not null default 'actif',
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  updated_at             timestamptz not null default now()
);

/**
 * Compteurs de consommation, un enregistrement par utilisateur et par jour.
 * Postgres plutôt qu'un Redis : le volume est trivial, et cela évite d'ajouter
 * un fournisseur d'infrastructure pour un simple compteur.
 */
create table public.usage_counters (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  day            date not null default current_date,
  ai_messages    integer not null default 0 check (ai_messages >= 0),
  ai_generations integer not null default 0 check (ai_generations >= 0),
  primary key (user_id, day)
);

-- Journal de coût : sert à surveiller la dépense réelle par route.
create table public.ai_usage_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  route        text not null,
  model        text not null,
  tokens_in    integer not null default 0,
  tokens_out   integer not null default 0,
  cache_read   integer not null default 0,
  cost_est_usd numeric(10, 6),
  created_at   timestamptz not null default now()
);

create index ai_usage_log_user_idx on public.ai_usage_log (user_id, created_at desc);

/* ------------------------------------------------------------------ Quotas -- */

-- Limites journalières par plan. Le plan gratuit doit rester utilisable tout
-- en protégeant la facture d'API.
create table public.plan_limits (
  plan               public.plan_tier primary key,
  ai_messages_day    integer not null,
  ai_generations_day integer not null
);

insert into public.plan_limits (plan, ai_messages_day, ai_generations_day) values
  ('gratuit', 20, 3),
  ('pro',    500, 100);

/**
 * Incrémente un compteur si le quota du plan le permet.
 * Renvoie `allowed = false` quand la limite est atteinte : la route IA doit
 * alors s'arrêter AVANT d'appeler le modèle.
 */
create or replace function public.consume_quota(p_kind text, p_amount integer default 1)
returns table (allowed boolean, used integer, limit_value integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_plan  public.plan_tier;
  v_limit integer;
  v_used  integer;
begin
  if v_user is null then
    raise exception 'consume_quota: appel non authentifié' using errcode = '42501';
  end if;

  if p_kind not in ('ai_messages', 'ai_generations') then
    raise exception 'consume_quota: compteur inconnu (%)', p_kind
      using errcode = '22023';
  end if;

  select coalesce(s.plan, 'gratuit') into v_plan
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id
  where p.id = v_user;

  select case p_kind
           when 'ai_messages' then ai_messages_day
           else ai_generations_day
         end
    into v_limit
  from public.plan_limits where plan = v_plan;

  insert into public.usage_counters (user_id, day)
  values (v_user, current_date)
  on conflict (user_id, day) do nothing;

  -- Verrou de ligne : deux requêtes simultanées ne doivent pas franchir
  -- la limite chacune de leur côté.
  select case p_kind
           when 'ai_messages' then ai_messages
           else ai_generations
         end
    into v_used
  from public.usage_counters
  where user_id = v_user and day = current_date
  for update;

  if v_used + p_amount > v_limit then
    return query select false, v_used, v_limit;
    return;
  end if;

  if p_kind = 'ai_messages' then
    update public.usage_counters set ai_messages = ai_messages + p_amount
     where user_id = v_user and day = current_date;
  else
    update public.usage_counters set ai_generations = ai_generations + p_amount
     where user_id = v_user and day = current_date;
  end if;

  return query select true, v_used + p_amount, v_limit;
end;
$$;

revoke all on function public.consume_quota(text, integer) from public;
grant execute on function public.consume_quota(text, integer) to authenticated;

/* -------------------------------------------------------------------- RLS -- */

alter table public.subscriptions  enable row level security;
alter table public.usage_counters enable row level security;
alter table public.ai_usage_log   enable row level security;
alter table public.plan_limits    enable row level security;

-- Lecture seule côté client : l'écriture passe par le webhook Stripe
-- (rôle service) et par `consume_quota`.
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "usage_counters_select_own" on public.usage_counters
  for select using (auth.uid() = user_id);

create policy "ai_usage_log_select_own" on public.ai_usage_log
  for select using (auth.uid() = user_id);

create policy "plan_limits_select_all" on public.plan_limits
  for select to authenticated using (true);

/* ------------------------------------------ Abonnement gratuit à l'inscription */

create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_subscription
  after insert on public.profiles
  for each row execute function public.handle_new_subscription();
