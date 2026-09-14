/**
 * Répétition espacée — algorithme SM-2.
 *
 * Fonction pure, sans dépendance et sans effet de bord : c'est elle qui décide
 * quand une carte doit revenir. Elle est testée unitairement et utilisée à
 * l'identique côté client (aperçu du prochain rappel) et côté serveur
 * (écriture de `flashcard_states`).
 */

/** Qualité de rappel, de 0 (oubli total) à 5 (immédiat et sûr). */
export type Sm2Grade = 0 | 1 | 2 | 3 | 4 | 5;

/** Les quatre boutons proposés à l'utilisateur, traduits en note SM-2. */
export const REVIEW_BUTTONS = [
  { key: "again", label: "Encore", grade: 1 as Sm2Grade },
  { key: "hard", label: "Difficile", grade: 3 as Sm2Grade },
  { key: "good", label: "Bien", grade: 4 as Sm2Grade },
  { key: "easy", label: "Facile", grade: 5 as Sm2Grade },
] as const;

export type ReviewButtonKey = (typeof REVIEW_BUTTONS)[number]["key"];

export interface Sm2State {
  /** Facteur de facilité. Jamais sous 1.3, sinon les intervalles s'effondrent. */
  ease: number;
  /** Intervalle courant, en jours. */
  intervalDays: number;
  /** Répétitions réussies consécutives. */
  reps: number;
  /** Nombre total d'oublis. */
  lapses: number;
}

export const MIN_EASE = 1.3;
export const DEFAULT_EASE = 2.5;

/** État d'une carte jamais révisée. */
export function initialState(): Sm2State {
  return { ease: DEFAULT_EASE, intervalDays: 0, reps: 0, lapses: 0 };
}

/** Une note ≥ 3 vaut réussite ; en dessous, la carte est réapprise. */
export function isSuccess(grade: Sm2Grade): boolean {
  return grade >= 3;
}

/**
 * Applique une révision et renvoie le nouvel état.
 * N'altère jamais l'état reçu.
 */
export function review(state: Sm2State, grade: Sm2Grade): Sm2State {
  const prev: Sm2State = {
    ease: Number.isFinite(state.ease) ? state.ease : DEFAULT_EASE,
    intervalDays: Math.max(0, state.intervalDays),
    reps: Math.max(0, state.reps),
    lapses: Math.max(0, state.lapses),
  };

  // Ajustement du facteur de facilité (formule SM-2 d'origine).
  const q = grade;
  const easeDelta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  const ease = Math.max(MIN_EASE, round2(prev.ease + easeDelta));

  if (!isSuccess(grade)) {
    // Échec : la carte repart à un jour, mais la facilité acquise est conservée.
    return {
      ease,
      intervalDays: 1,
      reps: 0,
      lapses: prev.lapses + 1,
    };
  }

  let intervalDays: number;
  if (prev.reps === 0) intervalDays = 1;
  else if (prev.reps === 1) intervalDays = 6;
  else intervalDays = Math.round(prev.intervalDays * ease);

  return {
    ease,
    intervalDays: Math.max(1, intervalDays),
    reps: prev.reps + 1,
    lapses: prev.lapses,
  };
}

/** Date du prochain rappel après une révision effectuée à `from`. */
export function nextDueDate(state: Sm2State, from: Date = new Date()): Date {
  const due = new Date(from);
  due.setDate(due.getDate() + state.intervalDays);
  return due;
}

/** Libellé court du prochain rappel, pour l'afficher sur les boutons. */
export function formatInterval(days: number): string {
  if (days <= 0) return "maintenant";
  if (days === 1) return "1 j";
  if (days < 30) return `${days} j`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} mois`;
  const years = Math.round(days / 365);
  return `${years} an${years > 1 ? "s" : ""}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
