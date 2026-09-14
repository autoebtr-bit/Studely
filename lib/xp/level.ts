/**
 * Courbe de progression des niveaux.
 *
 * XP cumulée requise pour atteindre le niveau L :  50 × (L − 1) × L
 *   N1 = 0, N2 = 100, N3 = 300, N4 = 600, N5 = 1000, N6 = 1500 …
 *
 * Ce fichier est la source de vérité, importée par l'UI, les tests, et par le
 * script qui seede la table de référence `levels` en base.
 * Aucune dépendance : il doit rester exécutable côté client comme côté serveur.
 */

export const MAX_LEVEL = 60;

/** XP cumulée nécessaire pour atteindre `level`. */
export function cumulativeXpForLevel(level: number): number {
  const l = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return 50 * (l - 1) * l;
}

/**
 * Ramène une XP quelconque à un entier exploitable.
 *
 * Une valeur négative ou NaN vaut 0 ; une valeur infinie est ramenée au sommet
 * de la courbe plutôt qu'à zéro, pour que la fonction reste monotone :
 * plus d'XP ne doit jamais produire un niveau plus bas.
 */
function sanitizeXp(xp: number): number {
  if (Number.isNaN(xp) || xp <= 0) return 0;
  if (!Number.isFinite(xp)) return cumulativeXpForLevel(MAX_LEVEL);
  return Math.floor(xp);
}

/**
 * Niveau atteint pour une XP totale donnée.
 * Résolution de 50L² − 50L − xp = 0, puis correction entière pour absorber
 * les imprécisions de `Math.sqrt` aux bornes exactes.
 */
export function levelFromXp(xp: number): number {
  const safeXp = sanitizeXp(xp);
  let level = Math.floor((50 + Math.sqrt(2500 + 200 * safeXp)) / 100);
  level = Math.max(1, Math.min(MAX_LEVEL, level));

  while (level < MAX_LEVEL && cumulativeXpForLevel(level + 1) <= safeXp) level++;
  while (level > 1 && cumulativeXpForLevel(level) > safeXp) level--;

  return level;
}

const TITLE_THRESHOLDS: ReadonlyArray<readonly [level: number, title: string]> = [
  [1, "Novice"],
  [3, "Apprenti"],
  [5, "Assidu"],
  [8, "Stratège"],
  [12, "Expert"],
  [16, "Maître"],
  [20, "Légende"],
];

/** Titre associé à un niveau (le plus haut palier atteint). */
export function titleForLevel(level: number): string {
  let title = TITLE_THRESHOLDS[0]![1];
  for (const [threshold, candidate] of TITLE_THRESHOLDS) {
    if (level >= threshold) title = candidate;
  }
  return title;
}

export interface LevelProgress {
  level: number;
  title: string;
  xpTotal: number;
  /** XP acquise depuis le début du niveau courant. */
  xpIntoLevel: number;
  /** XP nécessaire pour traverser le niveau courant. `null` au niveau max. */
  xpForNextLevel: number | null;
  /** Avancement dans le niveau courant, de 0 à 100. */
  pct: number;
  isMaxLevel: boolean;
}

/** Décompose une XP totale en tout ce dont l'UI a besoin pour l'afficher. */
export function levelProgress(xpTotal: number): LevelProgress {
  const xp = sanitizeXp(xpTotal);
  const level = levelFromXp(xp);
  const isMaxLevel = level >= MAX_LEVEL;

  const floor = cumulativeXpForLevel(level);
  const ceiling = isMaxLevel ? null : cumulativeXpForLevel(level + 1);

  const xpIntoLevel = xp - floor;
  const xpForNextLevel = ceiling === null ? null : ceiling - floor;

  const pct =
    xpForNextLevel === null || xpForNextLevel === 0
      ? 100
      : Math.min(100, Math.max(0, (xpIntoLevel / xpForNextLevel) * 100));

  return {
    level,
    title: titleForLevel(level),
    xpTotal: xp,
    xpIntoLevel,
    xpForNextLevel,
    pct,
    isMaxLevel,
  };
}

/** Table de référence à seeder en base (`levels`). */
export function buildLevelTable() {
  return Array.from({ length: MAX_LEVEL }, (_, i) => {
    const level = i + 1;
    return {
      level,
      xp_required: cumulativeXpForLevel(level),
      title: titleForLevel(level),
    };
  });
}
