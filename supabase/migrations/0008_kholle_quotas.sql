-- ============================================================================
-- 0008 — Le budget de khôlles
--
-- 0006 comptait des « générations » indifférenciées : un podcast, un lot de
-- fiches et une khôlle valaient chacun 1, alors que leurs coûts réels varient
-- d'un facteur dix. Le budget suit désormais ce qui coûte.
--
-- Une khôlle vaut UNE unité, réservée au lancement. La notation et les relances
-- qui suivent sont incluses : couper un élève avant sa fiche notée lui ferait
-- perdre vingt minutes d'oral pour rien.
--
-- Les volumes sont dupliqués dans `lib/billing/plans.ts` et verrouillés par
-- `tests/integration/plan-parity.test.ts`.
-- ============================================================================

/* ------------------------------------------------------- Limites par plan -- */

alter table public.plan_limits
  add column kholles_per_period integer not null default 1
      check (kholles_per_period >= 0),
  add column kholle_period text not null default 'week'
      check (kholle_period in ('week', 'month'));

-- Gratuit : c'est un ESSAI, pas un plan. Ses khôlles offertes épuisées, plus
-- aucun appel au modèle — d'où les trois compteurs à zéro.
--
-- Laisser ne serait-ce qu'une génération par jour rendrait le coût d'un compte
-- non converti récurrent et sans plafond : c'est exactement ce qui rendait
-- l'ancien plan gratuit intenable. Ce qui reste utilisable (révision des fiches
-- déjà produites, planning, relecture des bilans) ne passe par aucun de ces
-- compteurs.
update public.plan_limits set
  kholles_per_period = 0,
  kholle_period      = 'week',
  ai_messages_day    = 0,
  ai_generations_day = 0
  where plan = 'gratuit';

-- Pro : vingt par mois, soit ~5 par semaine, très au-dessus du rythme réel.
update public.plan_limits set
  kholles_per_period = 20,
  kholle_period      = 'month',
  ai_messages_day    = 40,
  ai_generations_day = 30
  where plan = 'pro';

/* ------------------------------------------------ Khôlles offertes (crédit) */

/**
 * Les khôlles de bienvenue sont un crédit, pas une allocation périodique :
 * l'élève les dépense au rythme qu'il veut, y compris les trois le soir de son
 * inscription. C'est précisément le but — se faire une idée tout de suite.
 *
 * Elles constituent tout l'essai : rien ne les recrédite.
 */
create table public.kholle_credits (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  remaining  integer not null default 3 check (remaining >= 0),
  granted_at timestamptz not null default now()
);

/* ------------------------------------------- Consommation par période ------ */

create table public.kholle_usage (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  -- Lundi de la semaine ISO, ou premier jour du mois, selon le plan.
  period_start date not null,
  used         integer not null default 0 check (used >= 0),
  primary key (user_id, period_start)
);

/* -------------------------------------------------------------------- RLS -- */

alter table public.kholle_credits enable row level security;
alter table public.kholle_usage   enable row level security;

-- Lecture seule : l'écriture passe exclusivement par `consume_kholle`.
-- Aucune politique d'insertion ou de mise à jour n'est créée, volontairement.
create policy "kholle_credits_select_own" on public.kholle_credits
  for select using (auth.uid() = user_id);

create policy "kholle_usage_select_own" on public.kholle_usage
  for select using (auth.uid() = user_id);

/* --------------------------------------------- Consommation d'une khôlle --- */

/**
 * Début de la période courante pour un plan donné.
 *
 * Le Pro s'aligne sur la fenêtre de facturation Stripe dès qu'elle est connue,
 * pour qu'un abonnement pris le 28 n'ouvre pas deux allocations en trois jours.
 * Tant que Stripe n'est pas branché, `current_period_end` est nul et l'on
 * retombe sur le mois calendaire — sans nouvelle migration le jour venu.
 */
create or replace function public.kholle_period_start(
  p_period       text,
  p_period_end   timestamptz
)
returns date
language sql
-- `stable` et non `immutable` : la fonction lit `now()`. Déclarée immutable,
-- le planificateur aurait le droit de la replier en constante.
stable
as $$
  select case
    when p_period = 'week' then (date_trunc('week', now()))::date
    when p_period_end is not null then (p_period_end - interval '1 month')::date
    else (date_trunc('month', now()))::date
  end;
$$;

/**
 * Réserve une khôlle blanche.
 *
 * Les crédits de bienvenue partent en premier. Renvoie de quoi afficher un
 * message honnête : combien il en reste, quand la prochaine arrive, et d'où
 * elle venait.
 */
create or replace function public.consume_kholle()
returns table (
  allowed   boolean,
  remaining integer,
  resets_at date,
  source    text,
  -- Faux pour l'essai : ses khôlles offertes épuisées, il n'y a pas de
  -- prochaine fois. Sans ce drapeau, l'interface annoncerait une date de
  -- renouvellement qui n'arrivera jamais.
  renews    boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_plan       public.plan_tier;
  v_period     text;
  v_limit      integer;
  v_period_end timestamptz;
  v_start      date;
  v_used       integer;
  v_credits    integer;
  v_next       date;
begin
  if v_user is null then
    raise exception 'consume_kholle: appel non authentifié' using errcode = '42501';
  end if;

  select coalesce(s.plan, 'gratuit'), s.current_period_end
    into v_plan, v_period_end
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id
  where p.id = v_user;

  select kholles_per_period, kholle_period
    into v_limit, v_period
  from public.plan_limits where plan = v_plan;

  -- Un plan sans ligne de limites doit refuser, jamais laisser passer sans
  -- borne : c'est la valeur par défaut la moins coûteuse en cas d'erreur.
  v_limit  := coalesce(v_limit, 0);
  v_period := coalesce(v_period, 'week');

  v_start := public.kholle_period_start(v_period, v_period_end);
  v_next  := case when v_period = 'week'
                  then v_start + interval '7 days'
                  else v_start + interval '1 month'
             end;

  -- 1. Les khôlles offertes, d'abord.
  insert into public.kholle_credits (user_id, remaining)
  values (v_user, 0)
  on conflict (user_id) do nothing;

  select kc.remaining into v_credits
  from public.kholle_credits kc
  where kc.user_id = v_user
  for update;

  if v_credits > 0 then
    update public.kholle_credits
       set remaining = remaining - 1
     where user_id = v_user;

    return query select true, v_credits - 1, v_next, 'offerte'::text, v_limit > 0;
    return;
  end if;

  -- 2. L'allocation de la période.
  insert into public.kholle_usage (user_id, period_start)
  values (v_user, v_start)
  on conflict (user_id, period_start) do nothing;

  -- Verrou de ligne : deux lancements simultanés ne doivent pas franchir la
  -- limite chacun de leur côté.
  select ku.used into v_used
  from public.kholle_usage ku
  where ku.user_id = v_user and ku.period_start = v_start
  for update;

  if v_used >= v_limit then
    return query select false, 0, v_next, 'plan'::text, v_limit > 0;
    return;
  end if;

  update public.kholle_usage
     set used = used + 1
   where user_id = v_user and period_start = v_start;

  return query select true, v_limit - v_used - 1, v_next, 'plan'::text, v_limit > 0;
end;
$$;

revoke all on function public.consume_kholle() from public;
grant execute on function public.consume_kholle() to authenticated;

/**
 * Solde, sans rien consommer — pour afficher « il te reste X khôlles » avant
 * que l'élève ne clique. Un bouton ne doit jamais échouer au clic.
 */
create or replace function public.kholle_balance()
returns table (
  credits   integer,
  remaining integer,
  resets_at date,
  /** Voir `consume_kholle` : faux pour l'essai, qui ne se renouvelle pas. */
  renews    boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_plan       public.plan_tier;
  v_period     text;
  v_limit      integer;
  v_period_end timestamptz;
  v_start      date;
begin
  if v_user is null then
    raise exception 'kholle_balance: appel non authentifié' using errcode = '42501';
  end if;

  select coalesce(s.plan, 'gratuit'), s.current_period_end
    into v_plan, v_period_end
  from public.profiles p
  left join public.subscriptions s on s.user_id = p.id
  where p.id = v_user;

  select kholles_per_period, kholle_period
    into v_limit, v_period
  from public.plan_limits where plan = v_plan;

  v_limit  := coalesce(v_limit, 0);
  v_period := coalesce(v_period, 'week');

  v_start := public.kholle_period_start(v_period, v_period_end);

  return query
  select
    coalesce((select kc.remaining from public.kholle_credits kc
               where kc.user_id = v_user), 0),
    greatest(
      v_limit - coalesce((select ku.used from public.kholle_usage ku
                           where ku.user_id = v_user
                             and ku.period_start = v_start), 0),
      0
    ),
    (case when v_period = 'week'
          then v_start + interval '7 days'
          else v_start + interval '1 month'
     end)::date,
    v_limit > 0;
end;
$$;

revoke all on function public.kholle_balance() from public;
grant execute on function public.kholle_balance() to authenticated;

/* ------------------------------------------- Crédit offert à l'inscription -- */

/**
 * Remplace la version de 0006 : la ligne d'abonnement et le crédit de
 * bienvenue sont créés du même geste.
 */
create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.kholle_credits (user_id, remaining) values (new.id, 3)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

/* -------------------------------------------- Plafond de dépense mensuel --- */

/**
 * Dépense estimée du mois **pour le seul essai gratuit**.
 *
 * Volontairement limitée au gratuit, et pas à l'ensemble des utilisateurs.
 * Un abonné ne peut pas déraper : sa consommation est déjà bornée par son
 * quota mensuel, et elle est financée. Le compter dans un plafond global
 * revenait à couper le service à ceux qui paient dès que le produit marche —
 * la réussite déclenchait la panne.
 *
 * Le risque réellement non borné est ailleurs : la création massive de comptes
 * jetables, chacun emportant ses khôlles offertes. C'est ce que cette fonction
 * mesure, et c'est la seule chose que le plafond coupe.
 *
 * Pour la dépense totale, interroger directement `ai_usage_log` : elle sert au
 * suivi, pas au blocage.
 */
create or replace function public.free_tier_spend_this_month()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(l.cost_est_usd), 0)
  from public.ai_usage_log l
  left join public.subscriptions s on s.user_id = l.user_id
  where l.created_at >= date_trunc('month', now())
    and coalesce(s.plan, 'gratuit') = 'gratuit';
$$;

revoke all on function public.free_tier_spend_this_month() from public;
grant execute on function public.free_tier_spend_this_month() to authenticated;
