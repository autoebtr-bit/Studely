-- ============================================================================
-- 0005 — Expérience, niveaux, séries et badges
--
-- Principe de sécurité : le client ne décide JAMAIS d'un montant d'XP.
-- Il déclare un type d'événement et une portée ; le serveur calcule le gain
-- depuis `xp_rules`, applique le plafond journalier et refuse les doublons via
-- une clé d'idempotence unique.
--
-- Aucune policy INSERT/UPDATE/DELETE n'existe sur `xp_events` : la seule voie
-- d'écriture est la fonction `award_xp`, en SECURITY DEFINER.
-- ============================================================================

/* ------------------------------------------- Tables de référence (lecture) -- */

create table public.levels (
  level       integer primary key check (level >= 1),
  xp_required integer not null check (xp_required >= 0),
  title       text not null
);

create table public.xp_rules (
  kind       text primary key,
  base       integer not null check (base >= 0),
  daily_cap  integer check (daily_cap > 0),
  label      text not null
);

create table public.achievements (
  code        text primary key,
  title       text not null,
  description text not null,
  emoji       text not null,
  criteria    jsonb not null default '{}'::jsonb
);

/* ------------------------------------------------------ Registre d'événements */

create table public.xp_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  kind            text not null references public.xp_rules (kind),
  amount          integer not null check (amount >= 0),
  ref_table       text,
  ref_id          uuid,
  -- Rejouer exactement la même action ne peut pas créditer deux fois.
  idempotency_key text not null,
  created_at      timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index xp_events_user_idx on public.xp_events (user_id, created_at desc);
-- Sert au calcul du plafond journalier.
create index xp_events_daily_idx
  on public.xp_events (user_id, kind, created_at);

create table public.user_achievements (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  achievement_code text not null references public.achievements (code) on delete cascade,
  unlocked_at      timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

/* ------------------------------------------------------------ Courbe de niveau */

-- Réplique exacte de `lib/xp/level.ts` : xp_cumulée(L) = 50 × (L−1) × L.
-- Les deux implémentations sont vérifiées l'une contre l'autre par les tests.
create or replace function public.level_from_xp(p_xp integer)
returns integer
language plpgsql
immutable
as $$
declare
  v_xp    integer := greatest(coalesce(p_xp, 0), 0);
  v_max   integer;
  v_level integer;
begin
  select coalesce(max(level), 1) into v_max from public.levels;

  v_level := floor((50 + sqrt(2500 + 200 * v_xp::numeric)) / 100)::integer;
  v_level := greatest(1, least(v_max, v_level));

  -- Correction entière : sqrt() peut renvoyer 149.99999 au lieu de 150.
  while v_level < v_max and 50 * v_level * (v_level + 1) <= v_xp loop
    v_level := v_level + 1;
  end loop;
  while v_level > 1 and 50 * (v_level - 1) * v_level > v_xp loop
    v_level := v_level - 1;
  end loop;

  return v_level;
end;
$$;

/* ---------------------------------- Maintien de xp_total / level sur profils -- */

create or replace function public.sync_profile_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  select coalesce(sum(amount), 0) into v_total
  from public.xp_events
  where user_id = new.user_id;

  update public.profiles
     set xp_total = v_total,
         level    = public.level_from_xp(v_total)
   where id = new.user_id;

  return new;
end;
$$;

create trigger xp_events_sync_profile
  after insert on public.xp_events
  for each row execute function public.sync_profile_xp();

/* ------------------------------------------------------------ Attribution XP -- */

/**
 * Crédite de l'expérience à l'utilisateur courant.
 *
 * @param p_kind    type d'événement, doit exister dans `xp_rules`
 * @param p_scope   portée unique de l'événement (id de leçon, date du jour…)
 * @param p_context contexte de calcul : { "score20": 15 } ou { "streakDays": 4 }
 *
 * Renvoie le montant réellement crédité (0 si doublon ou plafond atteint),
 * le nouveau total, le nouveau niveau et s'il y a eu passage de niveau.
 */
create or replace function public.award_xp(
  p_kind      text,
  p_scope     text,
  p_context   jsonb default '{}'::jsonb,
  p_ref_table text default null,
  p_ref_id    uuid default null
)
returns table (
  awarded    integer,
  new_total  integer,
  new_level  integer,
  leveled_up boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_rule       public.xp_rules%rowtype;
  v_key        text;
  v_amount     integer;
  v_today      integer;
  v_awarded    integer;
  v_old_level  integer;
  v_new_total  integer;
  v_new_level  integer;
  v_inserted   boolean := false;
begin
  if v_user is null then
    raise exception 'award_xp: appel non authentifié'
      using errcode = '42501';
  end if;

  select * into v_rule from public.xp_rules where kind = p_kind;
  if not found then
    raise exception 'award_xp: type d''événement inconnu (%)', p_kind
      using errcode = '22023';
  end if;

  select level into v_old_level from public.profiles where id = v_user;

  -- 1. Montant, calculé serveur — jamais fourni par le client.
  v_amount := v_rule.base;

  if p_kind = 'oral_session_completed' then
    v_amount := v_rule.base + round(
      (least(greatest(coalesce((p_context ->> 'score20')::numeric, 0), 0), 20) / 20) * 20
    )::integer;

  elsif p_kind = 'daily_streak' then
    v_amount := v_rule.base * least(
      greatest(coalesce((p_context ->> 'streakDays')::integer, 1), 1), 7
    );
  end if;

  -- 2. Plafond journalier, calculé sur les événements du jour.
  if v_rule.daily_cap is not null then
    select coalesce(sum(amount), 0) into v_today
    from public.xp_events
    where user_id = v_user
      and kind = p_kind
      and created_at >= date_trunc('day', now());

    v_amount := greatest(0, least(v_amount, v_rule.daily_cap - v_today));
  end if;

  -- 3. Écriture idempotente.
  v_key := p_kind || ':' || p_scope;

  insert into public.xp_events
    (user_id, kind, amount, ref_table, ref_id, idempotency_key)
  values
    (v_user, p_kind, v_amount, p_ref_table, p_ref_id, v_key)
  on conflict (user_id, idempotency_key) do nothing;

  get diagnostics v_inserted = row_count;
  v_awarded := case when v_inserted then v_amount else 0 end;

  select xp_total, level into v_new_total, v_new_level
  from public.profiles where id = v_user;

  return query select
    v_awarded,
    v_new_total,
    v_new_level,
    v_new_level > coalesce(v_old_level, 1);
end;
$$;

revoke all on function public.award_xp(text, text, jsonb, text, uuid) from public;
grant execute on function public.award_xp(text, text, jsonb, text, uuid) to authenticated;

/* ------------------------------------------------------------------ Séries -- */

/** Met à jour la série quotidienne et crédite le bonus le cas échéant. */
create or replace function public.touch_streak()
returns table (streak_current integer, streak_best integer, xp_awarded integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_last    date;
  v_current integer;
  v_best    integer;
  v_today   date := current_date;
  v_xp      integer := 0;
begin
  if v_user is null then
    raise exception 'touch_streak: appel non authentifié' using errcode = '42501';
  end if;

  select last_active_date, profiles.streak_current, profiles.streak_best
    into v_last, v_current, v_best
  from public.profiles where id = v_user
  for update;

  if v_last = v_today then
    -- Déjà compté aujourd'hui : rien à faire.
    return query select v_current, v_best, 0;
    return;
  end if;

  if v_last = v_today - 1 then
    v_current := coalesce(v_current, 0) + 1;   -- série poursuivie
  else
    v_current := 1;                            -- série rompue ou première fois
  end if;

  v_best := greatest(coalesce(v_best, 0), v_current);

  update public.profiles
     set streak_current   = v_current,
         streak_best      = v_best,
         last_active_date = v_today
   where id = v_user;

  select awarded into v_xp
  from public.award_xp(
    'daily_streak',
    v_today::text,
    jsonb_build_object('streakDays', v_current)
  );

  return query select v_current, v_best, coalesce(v_xp, 0);
end;
$$;

revoke all on function public.touch_streak() from public;
grant execute on function public.touch_streak() to authenticated;

/* -------------------------------------------------------------------- RLS -- */

alter table public.levels            enable row level security;
alter table public.xp_rules          enable row level security;
alter table public.achievements      enable row level security;
alter table public.xp_events         enable row level security;
alter table public.user_achievements enable row level security;

-- Tables de référence : lecture seule pour tout utilisateur connecté.
create policy "levels_select_all" on public.levels
  for select to authenticated using (true);
create policy "xp_rules_select_all" on public.xp_rules
  for select to authenticated using (true);
create policy "achievements_select_all" on public.achievements
  for select to authenticated using (true);

-- Historique d'XP : lecture de ses propres lignes uniquement.
-- Aucune policy d'écriture : `award_xp` est la seule porte d'entrée.
create policy "xp_events_select_own" on public.xp_events
  for select using (auth.uid() = user_id);

create policy "user_achievements_select_own" on public.user_achievements
  for select using (auth.uid() = user_id);
