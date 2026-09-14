/**
 * Barème d'expérience.
 *
 * Source de vérité unique, importée par l'UI (aperçu des gains), par les tests,
 * et par le script qui génère la fonction SQL `award_xp`.
 *
 * Règle non négociable : l'XP n'est jamais attribuée depuis le client.
 * Le client peut *prédire* un gain pour l'animer, mais seule la RPC serveur
 * `award_xp` écrit dans `xp_events`.
 */

export type XpKind =
  | "lesson_completed"
  | "flashcard_review"
  | "flashcard_session_completed"
  | "exercise_attempted"
  | "exercise_correct"
  | "oral_session_completed"
  | "podcast_chapter_listened"
  | "plan_session_completed"
  | "annale_completed"
  | "daily_streak"
  | "first_import"
  | "onboarding_completed";

export interface XpRule {
  kind: XpKind;
  /** Gain de base. Certains types ajoutent un bonus (voir `computeXpAward`). */
  base: number;
  /** Plafond d'XP par jour pour ce type. `null` = pas de plafond. */
  dailyCap: number | null;
  label: string;
}

export const XP_RULES: Record<XpKind, XpRule> = {
  lesson_completed: {
    kind: "lesson_completed",
    base: 50,
    dailyCap: null,
    label: "Leçon terminée",
  },
  flashcard_review: {
    kind: "flashcard_review",
    base: 2,
    dailyCap: 60,
    label: "Carte révisée",
  },
  flashcard_session_completed: {
    kind: "flashcard_session_completed",
    base: 15,
    dailyCap: 45,
    label: "Session de flashcards",
  },
  exercise_attempted: {
    kind: "exercise_attempted",
    base: 3,
    dailyCap: 100,
    label: "Exercice tenté",
  },
  exercise_correct: {
    kind: "exercise_correct",
    base: 10,
    dailyCap: 100,
    label: "Exercice réussi",
  },
  oral_session_completed: {
    kind: "oral_session_completed",
    base: 40,
    dailyCap: 120,
    label: "Colle orale terminée",
  },
  podcast_chapter_listened: {
    kind: "podcast_chapter_listened",
    base: 20,
    dailyCap: 60,
    label: "Chapitre écouté",
  },
  plan_session_completed: {
    kind: "plan_session_completed",
    base: 15,
    dailyCap: 45,
    label: "Séance validée",
  },
  annale_completed: {
    kind: "annale_completed",
    base: 60,
    dailyCap: null,
    label: "Annale terminée",
  },
  daily_streak: {
    kind: "daily_streak",
    base: 10,
    dailyCap: 70,
    label: "Série quotidienne",
  },
  first_import: {
    kind: "first_import",
    base: 25,
    dailyCap: null,
    label: "Premier import",
  },
  onboarding_completed: {
    kind: "onboarding_completed",
    base: 30,
    dailyCap: null,
    label: "Profil complété",
  },
};

export interface XpContext {
  /** Note sur 20, pour `oral_session_completed`. */
  score20?: number;
  /** Jours consécutifs, pour `daily_streak`. */
  streakDays?: number;
}

/**
 * Gain brut pour un événement, avant application du plafond journalier
 * (le plafond est appliqué en base, dans `award_xp`, où l'historique est connu).
 */
export function computeXpAward(kind: XpKind, ctx: XpContext = {}): number {
  const rule = XP_RULES[kind];

  switch (kind) {
    case "oral_session_completed": {
      // 40 de base + jusqu'à 20 selon la note obtenue.
      const score = clamp(ctx.score20 ?? 0, 0, 20);
      return rule.base + Math.round((score / 20) * 20);
    }
    case "daily_streak": {
      // Récompense croissante, plafonnée à 7 jours pour éviter l'emballement.
      const days = clamp(Math.floor(ctx.streakDays ?? 1), 1, 7);
      return rule.base * days;
    }
    default:
      return rule.base;
  }
}

/**
 * Clé d'idempotence d'un événement. Contrainte UNIQUE en base : rejouer la même
 * action ne peut pas créditer deux fois.
 * `scope` doit être stable et unique (id de leçon, id de séance, date du jour…).
 */
export function xpIdempotencyKey(kind: XpKind, scope: string): string {
  return `${kind}:${scope}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
