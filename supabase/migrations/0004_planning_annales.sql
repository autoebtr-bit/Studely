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
