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
