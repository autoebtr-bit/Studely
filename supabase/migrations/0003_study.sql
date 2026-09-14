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
