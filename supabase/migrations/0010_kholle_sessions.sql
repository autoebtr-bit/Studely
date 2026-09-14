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
