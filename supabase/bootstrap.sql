-- ===========================================================================
-- BOOTSTRAP — tout le schéma Studely en un seul fichier
--
-- Fichier de COMMODITÉ, généré pour la première mise en route : il se colle en
-- une fois dans l'éditeur SQL de Supabase, sans passer par la ligne de commande.
--
-- LA SOURCE DE VÉRITÉ RESTE supabase/migrations/. Toute modification ultérieure
-- se fait là-bas, jamais ici. Ce fichier peut être supprimé après usage.
--
-- À LANCER UNE SEULE FOIS. Les fonctions sont en « create or replace », donc
-- rejouables, mais pas les tables ni les politiques de sécurité : un second
-- passage échouerait sur « already exists ». Sur un projet neuf, tout passe.
-- En cas d'erreur en cours de route, corriger la cause puis réinitialiser la
-- base plutôt que de recoller par-dessus.
--
-- Contenu : migrations 0001 à 0010, puis seed.sql — le barème d'XP, les
-- niveaux et les succès. Sans ce dernier, award_xp n'a aucune règle à
-- appliquer et l'XP ne crédite rien, silencieusement.
-- ===========================================================================


-- ###########################################################################
-- ## 0001_profiles.sql
-- ###########################################################################

-- ============================================================================
-- 0001 — Profils utilisateurs
--
-- Chaque ligne de `profiles` prolonge une ligne de `auth.users`. Elle est créée
-- automatiquement à l'inscription : aucun code applicatif n'a besoin de s'en
-- souvenir, et il ne peut donc pas exister d'utilisateur sans profil.
-- ============================================================================

create extension if not exists "pgcrypto";

create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  full_name         text,
  avatar_url        text,
  study_level       text,
  exam_date         date,

  -- Dénormalisations maintenues par trigger depuis `xp_events` (voir 0005).
  -- Ne jamais écrire ces colonnes depuis l'application.
  xp_total          integer not null default 0 check (xp_total >= 0),
  level             integer not null default 1 check (level >= 1),

  streak_current    integer not null default 0 check (streak_current >= 0),
  streak_best       integer not null default 0 check (streak_best >= 0),
  last_active_date  date,

  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on column public.profiles.xp_total is
  'Dénormalisé depuis xp_events par trigger. Lecture seule côté application.';

-- --------------------------------------------------------------------- RLS --

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Volontairement aucune policy INSERT ni DELETE : la création passe par le
-- trigger ci-dessous et la suppression par la cascade depuis auth.users.

-- ------------------------------------------------------ Création auto profil --

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ updated_at ----

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ###########################################################################
-- ## 0002_courses.sql
-- ###########################################################################

-- ============================================================================
-- 0002 — Matières, chapitres, leçons, documents importés
--
-- `user_id` est répété sur chaque table (y compris là où il serait déductible
-- par jointure) : cela permet des policies RLS simples et indexables, sans
-- sous-requête à chaque lecture.
-- ============================================================================

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 120),
  color       text not null default '#6D3BEA',
  emoji       text,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index subjects_user_idx on public.subjects (user_id, position);

create table public.chapters (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.subjects (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null check (length(trim(title)) between 1 and 200),
  position      integer not null default 0,
  progress_pct  integer not null default 0 check (progress_pct between 0 and 100),
  created_at    timestamptz not null default now()
);

create index chapters_subject_idx on public.chapters (subject_id, position);
create index chapters_user_idx on public.chapters (user_id);

create type public.lesson_source as enum ('manuel', 'pdf', 'image', 'texte');
create type public.lesson_status as enum ('brouillon', 'pret', 'erreur');

create table public.lessons (
  id                uuid primary key default gen_random_uuid(),
  chapter_id        uuid not null references public.chapters (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (length(trim(title)) between 1 and 200),
  content_md        text not null default '',
  summary_md        text,
  reading_minutes   integer not null default 5 check (reading_minutes >= 0),
  position          integer not null default 0,
  source_type       public.lesson_source not null default 'manuel',
  source_path       text,
  status            public.lesson_status not null default 'pret',
  completed_at      timestamptz,
  created_at        timestamptz not null default now()
);

create index lessons_chapter_idx on public.lessons (chapter_id, position);
create index lessons_user_idx on public.lessons (user_id);

create type public.document_status as enum ('en_attente', 'traitement', 'pret', 'erreur');

create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  storage_path    text not null,
  original_name   text not null,
  mime_type       text not null,
  size_bytes      integer not null check (size_bytes > 0),
  status          public.document_status not null default 'en_attente',
  extracted_text  text,
  error_message   text,
  created_at      timestamptz not null default now()
);

create index documents_user_idx on public.documents (user_id, created_at desc);

-- --------------------------------------------------------------------- RLS --

alter table public.subjects  enable row level security;
alter table public.chapters  enable row level security;
alter table public.lessons   enable row level security;
alter table public.documents enable row level security;

-- Ces quatre tables suivent exactement la même règle : l'utilisateur ne voit et
-- ne modifie que ses propres lignes.
do $$
declare
  t text;
begin
  foreach t in array array['subjects', 'chapters', 'lessons', 'documents']
  loop
    execute format($f$
      create policy %1$I on public.%2$I for select
        using (auth.uid() = user_id);
    $f$, t || '_select_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for insert
        with check (auth.uid() = user_id);
    $f$, t || '_insert_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for update
        using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t || '_update_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for delete
        using (auth.uid() = user_id);
    $f$, t || '_delete_own', t);
  end loop;
end;
$$;


-- ###########################################################################
-- ## 0003_study.sql
-- ###########################################################################

-- ============================================================================
-- 0003 — Flashcards, exercices, colles orales, conversations IA
-- ============================================================================

/* ------------------------------------------------------------- Flashcards -- */

create table public.flashcards (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  chapter_id        uuid not null references public.chapters (id) on delete cascade,
  source_lesson_id  uuid references public.lessons (id) on delete set null,
  front             text not null check (length(trim(front)) > 0),
  back              text not null check (length(trim(back)) > 0),
  created_at        timestamptz not null default now()
);

create index flashcards_chapter_idx on public.flashcards (chapter_id);

-- État de répétition espacée, séparé de la carte : une carte peut être
-- regénérée sans perdre l'historique d'apprentissage.
create table public.flashcard_states (
  card_id        uuid primary key references public.flashcards (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  ease           numeric(4, 2) not null default 2.50 check (ease >= 1.30),
  interval_days  integer not null default 0 check (interval_days >= 0),
  reps           integer not null default 0 check (reps >= 0),
  lapses         integer not null default 0 check (lapses >= 0),
  due_at         timestamptz not null default now(),
  last_review_at timestamptz
);

-- Index de la requête la plus fréquente de l'application : « mes cartes dues ».
create index flashcard_states_due_idx on public.flashcard_states (user_id, due_at);

/* -------------------------------------------------------------- Exercices -- */

create type public.difficulty as enum ('facile', 'moyen', 'difficile');

create table public.exercises (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  chapter_id  uuid not null references public.chapters (id) on delete cascade,
  prompt      text not null check (length(trim(prompt)) > 0),
  solution    text,
  rubric      jsonb not null default '[]'::jsonb,
  difficulty  public.difficulty not null default 'moyen',
  minutes     integer not null default 10 check (minutes > 0),
  created_at  timestamptz not null default now()
);

create index exercises_chapter_idx on public.exercises (chapter_id);

create table public.exercise_attempts (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid not null references public.exercises (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  answer       text not null,
  score        integer check (score between 0 and 100),
  feedback     jsonb,
  created_at   timestamptz not null default now()
);

create index exercise_attempts_user_idx
  on public.exercise_attempts (user_id, created_at desc);

/* ------------------------------------------------------------ Colle orale -- */

create table public.oral_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  chapter_id  uuid not null references public.chapters (id) on delete cascade,
  score       integer check (score between 0 and 20),
  transcript  jsonb not null default '[]'::jsonb,
  feedback    jsonb,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz
);

create index oral_sessions_user_idx
  on public.oral_sessions (user_id, started_at desc);

/* --------------------------------------------------------- Conversations -- */

create table public.ai_conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  chapter_id  uuid references public.chapters (id) on delete set null,
  title       text not null default 'Nouvelle conversation',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index ai_conversations_user_idx
  on public.ai_conversations (user_id, updated_at desc);

create type public.message_role as enum ('user', 'assistant');

create table public.ai_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.ai_conversations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  role             public.message_role not null,
  content          text not null,
  tokens_in        integer,
  tokens_out       integer,
  created_at       timestamptz not null default now()
);

create index ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at);

/* -------------------------------------------------------------------- RLS -- */

alter table public.flashcards        enable row level security;
alter table public.flashcard_states  enable row level security;
alter table public.exercises         enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.oral_sessions     enable row level security;
alter table public.ai_conversations  enable row level security;
alter table public.ai_messages       enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'flashcards', 'flashcard_states', 'exercises', 'exercise_attempts',
    'oral_sessions', 'ai_conversations', 'ai_messages'
  ]
  loop
    execute format($f$
      create policy %1$I on public.%2$I for select
        using (auth.uid() = user_id);
    $f$, t || '_select_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for insert
        with check (auth.uid() = user_id);
    $f$, t || '_insert_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for update
        using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t || '_update_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for delete
        using (auth.uid() = user_id);
    $f$, t || '_delete_own', t);
  end loop;
end;
$$;


-- ###########################################################################
-- ## 0004_planning_annales.sql
-- ###########################################################################

-- ============================================================================
-- 0004 — Planning de révision, podcasts, annales
--
-- Les annales sont la seule table à contenu partagé : le catalogue est public
-- en lecture, les tentatives restent privées.
-- ============================================================================

/* ---------------------------------------------------------------- Planning -- */

create table public.study_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  exam_date    date not null,
  params       jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  is_active    boolean not null default true
);

create index study_plans_user_idx on public.study_plans (user_id, generated_at desc);

create type public.session_type as enum
  ('cours', 'flashcards', 'exercices', 'annale', 'oral');
create type public.session_status as enum ('a_faire', 'fait', 'reporte');

create table public.study_sessions (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid not null references public.study_plans (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  chapter_id    uuid references public.chapters (id) on delete set null,
  scheduled_on  date not null,
  start_time    time,
  duration_min  integer not null check (duration_min between 5 and 480),
  type          public.session_type not null,
  status        public.session_status not null default 'a_faire',
  completed_at  timestamptz
);

-- Requête « mon planning de la semaine ».
create index study_sessions_user_date_idx
  on public.study_sessions (user_id, scheduled_on);

/* ---------------------------------------------------------------- Podcasts -- */

create type public.podcast_status as enum ('en_attente', 'pret', 'erreur');

create table public.podcasts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  chapter_id     uuid not null references public.chapters (id) on delete cascade,
  title          text not null,
  script         jsonb not null default '[]'::jsonb,
  duration_est_s integer not null default 0 check (duration_est_s >= 0),
  status         public.podcast_status not null default 'en_attente',
  created_at     timestamptz not null default now(),
  unique (chapter_id)
);

create index podcasts_user_idx on public.podcasts (user_id);

/* ----------------------------------------------------------------- Annales -- */

create table public.annales (
  id                uuid primary key default gen_random_uuid(),
  subject_slug      text not null,
  subject_label     text not null,
  year              integer not null check (year between 1990 and 2100),
  session_label     text not null,
  level             text not null,
  duration_minutes  integer not null check (duration_minutes > 0),
  storage_path      text,
  is_public         boolean not null default true,
  created_at        timestamptz not null default now()
);

create index annales_lookup_idx on public.annales (subject_slug, year desc);

create table public.annale_attempts (
  id          uuid primary key default gen_random_uuid(),
  annale_id   uuid not null references public.annales (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  score       integer check (score between 0 and 20),
  duration_s  integer check (duration_s >= 0),
  notes       text,
  created_at  timestamptz not null default now()
);

create index annale_attempts_user_idx
  on public.annale_attempts (user_id, created_at desc);

/* -------------------------------------------------------------------- RLS -- */

alter table public.study_plans     enable row level security;
alter table public.study_sessions  enable row level security;
alter table public.podcasts        enable row level security;
alter table public.annales         enable row level security;
alter table public.annale_attempts enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'study_plans', 'study_sessions', 'podcasts', 'annale_attempts'
  ]
  loop
    execute format($f$
      create policy %1$I on public.%2$I for select
        using (auth.uid() = user_id);
    $f$, t || '_select_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for insert
        with check (auth.uid() = user_id);
    $f$, t || '_insert_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for update
        using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $f$, t || '_update_own', t);

    execute format($f$
      create policy %1$I on public.%2$I for delete
        using (auth.uid() = user_id);
    $f$, t || '_delete_own', t);
  end loop;
end;
$$;

-- Catalogue d'annales : lisible par tout utilisateur connecté, jamais
-- modifiable depuis l'application (l'alimentation se fait via le rôle service).
create policy "annales_select_public"
  on public.annales for select
  to authenticated
  using (is_public);


-- ###########################################################################
-- ## 0005_gamification.sql
-- ###########################################################################

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


-- ###########################################################################
-- ## 0006_billing.sql
-- ###########################################################################

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


-- ###########################################################################
-- ## 0007_storage.sql
-- ###########################################################################

-- ============================================================================
-- 0007 — Buckets de stockage
--
-- Règle de cloisonnement : tout fichier d'un utilisateur vit sous un préfixe
-- `{user_id}/`. Les policies comparent le premier segment du chemin à
-- `auth.uid()`, ce qui interdit structurellement de lire le dossier d'autrui.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'documents', 'documents', false, 20971520,
    array[
      'application/pdf', 'text/plain', 'text/markdown',
      'image/png', 'image/jpeg', 'image/webp'
    ]
  ),
  (
    'avatars', 'avatars', true, 2097152,
    array['image/png', 'image/jpeg', 'image/webp']
  )
on conflict (id) do nothing;

/* ------------------------------------------- documents : strictement privé -- */

create policy "documents_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

/* ------------------------------ avatars : lecture publique, écriture privée -- */

create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ###########################################################################
-- ## 0008_kholle_quotas.sql
-- ###########################################################################

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


-- ###########################################################################
-- ## 0009_trial_identity.sql
-- ###########################################################################

-- ============================================================================
-- 0009 — Un essai par personne, pas par adresse
--
-- Sans ça, `victor+1@gmail.com`, `victor+2@gmail.com` et `v.i.c.t.o.r@gmail.com`
-- arrivent dans la même boîte et ouvrent trois essais gratuits.
--
-- Ce fichier ne prétend pas rendre la fraude impossible — elle ne l'est jamais.
-- Il ferme les contournements gratuits et automatiques, et laisse le plafond de
-- dépense (`free_tier_spend_this_month`) borner ce qui passerait quand même.
--
-- Principe de prudence : un essai vaut ~0,87 €. Refuser un vrai élève coûte
-- beaucoup plus cher que d'en laisser passer un malin — donc au moindre doute,
-- on n'assimile pas deux adresses.
-- ============================================================================

/* ------------------------------------------------- Identité canonique ----- */

/**
 * Réduit une adresse à l'identité qu'elle désigne.
 *
 * Les deux normalisations sont limitées aux fournisseurs où elles sont
 * documentées. Ailleurs, `a+b@x.fr` et `a.b@x.fr` peuvent appartenir à deux
 * personnes distinctes, et les fusionner refuserait l'essai à quelqu'un de
 * légitime.
 *
 * Doit rester identique à `canonicalEmail` (`lib/auth/email.ts`) ;
 * `tests/integration/email-parity.test.ts` le vérifie.
 */
create or replace function public.canonical_email(p_email text)
returns text
language plpgsql
immutable
as $$
declare
  v_clean  text := lower(trim(p_email));
  v_at     integer;
  v_local  text;
  v_domain text;
  v_plus   integer;
begin
  v_at := length(v_clean) - position('@' in reverse(v_clean)) + 1;
  if v_at <= 1 or v_at >= length(v_clean) then
    return null;
  end if;

  v_local  := substring(v_clean from 1 for v_at - 1);
  v_domain := substring(v_clean from v_at + 1);

  if v_local = '' or position('.' in v_domain) = 0 then
    return null;
  end if;

  -- googlemail.com sert la même boîte que gmail.com.
  if v_domain = 'googlemail.com' then
    v_domain := 'gmail.com';
  end if;

  -- L'étiquette après « + » ne change pas la destination.
  if v_domain in (
    'gmail.com','outlook.com','outlook.fr','hotmail.com','hotmail.fr',
    'live.com','live.fr','msn.com','yahoo.com','yahoo.fr','proton.me',
    'protonmail.com','pm.me','icloud.com','me.com','fastmail.com'
  ) then
    v_plus := position('+' in v_local);
    if v_plus > 0 then
      v_local := substring(v_local from 1 for v_plus - 1);
    end if;
  end if;

  -- Chez Google, les points du nom d'utilisateur sont ignorés.
  if v_domain = 'gmail.com' then
    v_local := replace(v_local, '.', '');
  end if;

  if v_local = '' then
    return null;
  end if;

  return v_local || '@' || v_domain;
end;
$$;

/* ----------------------------------------------- Domaines jetables -------- */

/**
 * Modifiable sans redéploiement : une liste exhaustive n'existe pas, de
 * nouveaux domaines apparaissent en permanence. Quand un abus est repéré, on
 * ajoute une ligne ici.
 */
create table public.disposable_email_domains (
  domain     text primary key,
  added_at   timestamptz not null default now()
);

insert into public.disposable_email_domains (domain) values
  ('10minutemail.com'), ('guerrillamail.com'), ('guerrillamail.info'),
  ('mailinator.com'),   ('yopmail.com'),       ('yopmail.fr'),
  ('temp-mail.org'),    ('tempmail.com'),      ('throwawaymail.com'),
  ('sharklasers.com'),  ('getnada.com'),       ('trashmail.com'),
  ('jetable.org'),      ('maildrop.cc'),       ('dispostable.com'),
  ('fakeinbox.com'),    ('mohmal.com'),        ('emailondeck.com'),
  ('spamgourmet.com'),  ('mytemp.email')
on conflict (domain) do nothing;

alter table public.disposable_email_domains enable row level security;
-- Aucune policy : seules les fonctions `security definer` la lisent. Exposer la
-- liste apprendrait à l'abuseur quels domaines éviter.

/* ------------------------------------------- Un crédit par identité ------- */

/**
 * Mémoire des essais déjà accordés, indépendante des comptes.
 *
 * Volontairement sans clé étrangère vers `profiles` : elle doit survivre à la
 * suppression du compte, sinon supprimer puis se réinscrire redonnerait
 * l'essai. C'est le contournement le plus évident une fois les alias fermés.
 */
create table public.trial_grants (
  email_canonical text primary key,
  granted_at      timestamptz not null default now(),
  /** Dernier compte servi, pour le suivi. Volontairement sans contrainte. */
  last_user_id    uuid
);

alter table public.trial_grants enable row level security;
-- Aucune policy : contenu strictement interne au serveur.

/* ------------------------------------ Attribution des khôlles offertes ---- */

/**
 * Remplace la version de 0008.
 *
 * L'essai n'est accordé que si les trois conditions tiennent :
 *  - l'adresse est exploitable,
 *  - son domaine n'est pas un service jetable connu,
 *  - cette identité n'a jamais reçu d'essai.
 *
 * Sinon le compte est créé normalement, avec zéro khôlle offerte. On ne refuse
 * pas l'inscription : l'élève peut consulter le produit et s'abonner, et un
 * faux positif ne lui ferme pas la porte.
 */
create or replace function public.handle_new_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email     text;
  v_canonical text;
  v_domain    text;
  v_credits   integer := 0;
begin
  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;

  select u.email into v_email from auth.users u where u.id = new.id;
  v_canonical := public.canonical_email(v_email);

  if v_canonical is not null then
    v_domain := split_part(v_canonical, '@', 2);

    if not exists (
      select 1 from public.disposable_email_domains d where d.domain = v_domain
    ) then
      -- `on conflict do nothing` puis test du nombre de lignes : deux
      -- inscriptions simultanées sur la même identité ne peuvent pas obtenir
      -- l'essai chacune de leur côté.
      insert into public.trial_grants (email_canonical, last_user_id)
      values (v_canonical, new.id)
      on conflict (email_canonical) do nothing;

      if found then
        v_credits := 3;
      end if;
    end if;
  end if;

  insert into public.kholle_credits (user_id, remaining)
  values (new.id, v_credits)
  on conflict (user_id) do nothing;

  return new;
end;
$$;


-- ###########################################################################
-- ## 0010_kholle_sessions.sql
-- ###########################################################################

-- ============================================================================
-- 0010 — Les khôlles laissent une trace
--
-- Jusqu'ici la fiche notée vivait dans l'état React et disparaissait au
-- rechargement. C'est ce que cette migration corrige, et c'est la seule chose
-- qu'une fenêtre de discussion généraliste ne peut pas faire : tenir le
-- registre des oraux d'un élève sur des mois.
--
-- `oral_sessions` (0003) ne pouvait pas servir : elle exige `chapter_id not
-- null` vers `chapters`, or une khôlle se lance depuis un programme tapé à la
-- main, sans chapitre. C'est un vestige d'avant le recentrage.
-- ============================================================================

create table public.kholle_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  /** Identifiant de format (`lib/kholle/formats.ts`), pas une clé étrangère :
      les formats vivent dans le code, pas en base. */
  format_id     text not null,
  filiere       text,
  score         numeric(4, 1) not null check (score >= 0 and score <= 20),
  verdict       text not null,
  strengths     jsonb not null default '[]'::jsonb,
  improvements  jsonb not null default '[]'::jsonb,
  /** Points attendus que l'élève n'a pas cités : matière première de la
      reprise ciblée (phase 2). */
  missed_points jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

-- La courbe se lit toujours « mes séances, de la plus ancienne à la plus
-- récente » : c'est cet index qui la rend immédiate.
create index kholle_sessions_user_idx
  on public.kholle_sessions (user_id, created_at);

/**
 * Notes par critère, dans leur propre table plutôt qu'en JSON.
 *
 * « L'exactitude des énoncés sur trois mois » doit être une requête ordinaire,
 * pas une fouille dans un document. C'est exactement ce que demande la courbe
 * de progression.
 */
create table public.kholle_criterion_scores (
  session_id   uuid not null references public.kholle_sessions (id) on delete cascade,
  /** Identifiant de critère du format, repris tel quel. */
  criterion_id text not null,
  score        numeric(4, 1) not null check (score >= 0 and score <= 20),
  comment      text not null default '',
  primary key (session_id, criterion_id)
);

/* -------------------------------------------------------------------- RLS -- */

alter table public.kholle_sessions        enable row level security;
alter table public.kholle_criterion_scores enable row level security;

-- L'élève lit ses propres séances. L'écriture passe par la route de notation,
-- qui s'exécute avec sa session : une policy d'insertion est donc nécessaire,
-- mais restreinte à ses propres lignes.
create policy "kholle_sessions_select_own" on public.kholle_sessions
  for select using (auth.uid() = user_id);

create policy "kholle_sessions_insert_own" on public.kholle_sessions
  for insert with check (auth.uid() = user_id);

-- Volontairement aucune policy UPDATE ni DELETE : une fiche notée ne se
-- retouche pas. Un élève qui pourrait réécrire ses notes rendrait la courbe
-- inutile, y compris pour lui.

create policy "kholle_criterion_scores_select_own" on public.kholle_criterion_scores
  for select using (
    exists (
      select 1 from public.kholle_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

create policy "kholle_criterion_scores_insert_own" on public.kholle_criterion_scores
  for insert with check (
    exists (
      select 1 from public.kholle_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );


-- ###########################################################################
-- ## seed.sql — barème XP, niveaux, succès
-- ###########################################################################

-- ============================================================================
-- Données de référence.
--
-- `levels` et `xp_rules` sont la réplique en base des constantes de
-- `lib/xp/level.ts` et `lib/xp/rules.ts`. Les deux sources sont comparées par
-- le test d'intégration `tests/integration/xp-parity.test.ts` : si l'une change
-- sans l'autre, le test échoue.
-- ============================================================================

/* ------------------------------------------------------- Barème d'expérience */

insert into public.xp_rules (kind, base, daily_cap, label) values
  ('lesson_completed',            50, null, 'Leçon terminée'),
  ('flashcard_review',             2,   60, 'Carte révisée'),
  ('flashcard_session_completed', 15,   45, 'Session de flashcards'),
  ('exercise_attempted',           3,  100, 'Exercice tenté'),
  ('exercise_correct',            10,  100, 'Exercice réussi'),
  ('oral_session_completed',      40,  120, 'Colle orale terminée'),
  ('podcast_chapter_listened',    20,   60, 'Chapitre écouté'),
  ('plan_session_completed',      15,   45, 'Séance validée'),
  ('annale_completed',            60, null, 'Annale terminée'),
  ('daily_streak',                10,   70, 'Série quotidienne'),
  ('first_import',                25, null, 'Premier import'),
  ('onboarding_completed',        30, null, 'Profil complété')
on conflict (kind) do update
  set base      = excluded.base,
      daily_cap = excluded.daily_cap,
      label     = excluded.label;

/* ------------------------------------------------------------ Table des niveaux
   xp_cumulée(L) = 50 × (L−1) × L, générée jusqu'au niveau 60.
   Titres : paliers aux niveaux 1, 3, 5, 8, 12, 16 et 20.                     */

insert into public.levels (level, xp_required, title)
select
  l,
  50 * (l - 1) * l,
  case
    when l >= 20 then 'Légende'
    when l >= 16 then 'Maître'
    when l >= 12 then 'Expert'
    when l >= 8  then 'Stratège'
    when l >= 5  then 'Assidu'
    when l >= 3  then 'Apprenti'
    else 'Novice'
  end
from generate_series(1, 60) as l
on conflict (level) do update
  set xp_required = excluded.xp_required,
      title       = excluded.title;

/* ------------------------------------------------------------------- Badges */

insert into public.achievements (code, title, description, emoji, criteria) values
  ('first_import',    'Premier pas',     'Importer un premier cours',            '📥', '{"type":"event","kind":"first_import"}'),
  ('streak_7',        'Régulier',        '7 jours d''affilée',                   '🔥', '{"type":"streak","days":7}'),
  ('streak_30',       'Increvable',      '30 jours d''affilée',                  '🗿', '{"type":"streak","days":30}'),
  ('cards_100',       'Mémoire vive',    '100 cartes révisées',                  '🧠', '{"type":"count","kind":"flashcard_review","value":100}'),
  ('cards_1000',      'Encyclopédie',    '1000 cartes révisées',                 '📚', '{"type":"count","kind":"flashcard_review","value":1000}'),
  ('oral_first',      'Prise de parole', 'Réussir une première colle orale',     '🎤', '{"type":"count","kind":"oral_session_completed","value":1}'),
  ('level_5',         'Assidu',          'Atteindre le niveau 5',                '⭐', '{"type":"level","value":5}'),
  ('level_10',        'Chevronné',       'Atteindre le niveau 10',               '🌟', '{"type":"level","value":10}'),
  ('annale_perfect',  'Sans faute',      'Obtenir 18/20 ou plus à une annale',   '🏅', '{"type":"annale_score","value":18}'),
  ('night_owl',       'Nocturne',        'Réviser après minuit',                 '🦉', '{"type":"time","after":"00:00"}')
on conflict (code) do update
  set title       = excluded.title,
      description = excluded.description,
      emoji       = excluded.emoji,
      criteria    = excluded.criteria;

/* ------------------------------------------- Catalogue d'annales (exemples) */

insert into public.annales
  (subject_slug, subject_label, year, session_label, level, duration_minutes)
values
  ('mathematiques', 'Mathématiques',      2025, 'Métropole — juin',       'Terminale', 240),
  ('mathematiques', 'Mathématiques',      2024, 'Métropole — juin',       'Terminale', 240),
  ('mathematiques', 'Mathématiques',      2024, 'Centres étrangers',      'Terminale', 240),
  ('physique',      'Physique-Chimie',    2025, 'Centres étrangers',      'Terminale', 210),
  ('physique',      'Physique-Chimie',    2024, 'Métropole — juin',       'Terminale', 210),
  ('philosophie',   'Philosophie',        2025, 'Métropole — juin',       'Terminale', 240),
  ('histoire',      'Histoire-Géographie',2024, 'Métropole — septembre',  'Terminale', 180)
on conflict do nothing;
