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
