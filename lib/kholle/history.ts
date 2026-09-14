/**
 * L'historique des khôlles, et ce qu'on en tire.
 *
 * Partagé par l'application (vraies séances) et par la vitrine (données
 * d'exemple) : les deux affichent exactement le même composant, ce qui garantit
 * que l'illustration montre bien ce que le produit fait.
 *
 * Tout est pur ici — aucune lecture de base — pour que le calcul de la courbe
 * se teste sans Supabase.
 */

export interface KholleCriterionScore {
  criterionId: string;
  /** Note sur 20. */
  score: number;
  comment?: string;
}

export interface KholleHistoryEntry {
  id: string;
  formatId: string;
  /** Note globale sur 20. */
  score: number;
  criteria: KholleCriterionScore[];
  /** Date ISO courte, la plus ancienne en premier. */
  date: string;
}

/**
 * Nombre de séances retenues pour la courbe.
 *
 * Au-delà, les points se tassent et la tendance devient illisible. Une dizaine
 * de khôlles couvre déjà un trimestre de prépa.
 */
export const TREND_WINDOW = 10;

/* ------------------------------------------------------------- Tendance -- */

export interface TrendPoint {
  /** Position horizontale, en pourcentage de la largeur utile. */
  x: number;
  /** Position verticale, en pourcentage de la hauteur utile. 0 = haut. */
  y: number;
  score: number;
  /** Libellé court sous le point : K1, K2… */
  label: string;
}

/**
 * Note maximale d'une khôlle. L'échelle du graphique va toujours de 0 à 20.
 *
 * Jamais de cadrage automatique sur les valeurs : avec un axe qui démarrerait à
 * 8, un progrès de deux points paraîtrait spectaculaire. Sur une note d'élève,
 * ce serait mentir avec un axe.
 */
export const MAX_SCORE = 20;

/**
 * Place les notes d'un critère sur la grille du graphique.
 *
 * Renvoie des pourcentages plutôt que des pixels : le composant reste
 * responsive sans recalcul, et la fonction se teste sans rendu.
 */
export function trendPoints(scores: number[]): TrendPoint[] {
  if (scores.length === 0) return [];

  // Un point unique se place au centre : une « courbe » d'une seule séance
  // n'existe pas, et le coller à gauche donnerait l'illusion d'un début de
  // pente.
  const step = scores.length === 1 ? 0 : 100 / (scores.length - 1);

  return scores.map((raw, i) => {
    const score = clamp(raw, 0, MAX_SCORE);
    return {
      x: scores.length === 1 ? 50 : i * step,
      y: 100 - (score / MAX_SCORE) * 100,
      score,
      label: `K${i + 1}`,
    };
  });
}

/** Notes d'un critère donné, dans l'ordre des séances. */
export function scoresFor(
  history: KholleHistoryEntry[],
  criterionId: string,
): number[] {
  return history
    .map((entry) => entry.criteria.find((c) => c.criterionId === criterionId))
    .filter((c): c is KholleCriterionScore => c !== undefined)
    .map((c) => c.score);
}

/**
 * Critère à montrer en premier : le plus faible en moyenne.
 *
 * C'est celui qui a besoin d'être vu. Ouvrir sur le meilleur flatterait sans
 * rien apprendre.
 *
 * À égalité, l'ordre du format tranche — il est stable, donc l'écran ne change
 * pas d'un rechargement à l'autre.
 */
export function weakestCriterion(
  history: KholleHistoryEntry[],
  criterionIds: string[],
): string | null {
  if (history.length === 0 || criterionIds.length === 0) return null;

  let weakest: string | null = null;
  let lowest = Number.POSITIVE_INFINITY;

  for (const id of criterionIds) {
    const scores = scoresFor(history, id);
    if (scores.length === 0) continue;

    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    if (mean < lowest) {
      lowest = mean;
      weakest = id;
    }
  }

  return weakest ?? criterionIds[0] ?? null;
}

/** Écart entre la première et la dernière note d'un critère. */
export function progression(scores: number[]): number | null {
  if (scores.length < 2) return null;

  const first = scores[0]!;
  const last = scores[scores.length - 1]!;
  return Math.round((last - first) * 10) / 10;
}

/**
 * Note globale d'une khôlle, calculée depuis ses critères et leurs poids.
 *
 * La note globale n'est pas un jugement séparé : c'est l'arithmétique du
 * barème, et les poids somment à 100 par construction (verrouillé par
 * `kholle-formats.test.ts`). La dériver garantit qu'une fiche ne peut pas
 * s'auto-contredire — afficher 14,5 au-dessus de critères qui font 13,6.
 *
 * Normalisée sur les poids réellement présents : si un critère manque, la note
 * porte sur ce qui a été évalué plutôt que d'être artificiellement basse.
 * Renvoie `null` quand rien n'est notable.
 */
export function weightedScore(
  entries: { criterionId: string; score: number }[],
  weights: { id: string; weight: number }[],
): number | null {
  let total = 0;
  let sumOfWeights = 0;

  for (const { id, weight } of weights) {
    const entry = entries.find((e) => e.criterionId === id);
    if (!entry) continue;

    total += clamp(entry.score, 0, MAX_SCORE) * weight;
    sumOfWeights += weight;
  }

  if (sumOfWeights === 0) return null;

  // Au demi-point près, comme une vraie note de khôlle.
  return Math.round((total / sumOfWeights) * 2) / 2;
}

/**
 * Une note telle qu'on l'écrit sur une copie française : « 16 », « 14,5 ».
 *
 * Partagé plutôt que recopié dans chaque composant — la même note apparaissait
 * en « 14.5 » dans un en-tête et en « 14,5 » deux lignes plus bas.
 */
export function formatScore(score: number): string {
  return score % 1 === 0 ? String(score) : score.toFixed(1).replace(".", ",");
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
