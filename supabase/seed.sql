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
