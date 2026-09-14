/**
 * Palette de dégradés des modules.
 *
 * Toutes les déclinaisons restent dans l'arc identitaire orange → rose →
 * violet : un module ne choisit pas une couleur libre, il choisit une position
 * sur ce dégradé. Re-thémer le produit revient à modifier ce seul fichier.
 *
 * Les valeurs sont des classes Tailwind littérales — ne pas les construire par
 * concaténation, le scanner de contenu ne les retrouverait pas au build.
 */
export const MODULE_GRADIENTS = {
  /** Dégradé complet, réservé au module mis en avant. */
  sunset: "from-brand-500 via-blush-500 to-accent-600",
  /** Chaud : orange vers rose. */
  ember: "from-brand-500 to-blush-500",
  /** Rose vers violet. */
  dusk: "from-blush-500 to-accent-600",
  /** Violet profond. */
  violet: "from-accent-500 to-accent-700",
  /** Orange franc. */
  flame: "from-brand-400 to-brand-600",
  /** Ambre vers orange. */
  amber: "from-amber-500 to-brand-500",
  /** Violet clair vers rose. */
  lilac: "from-accent-400 to-blush-500",
  /** Orange vers violet, transition longue. */
  aurora: "from-brand-500 to-accent-500",
  /** Violet très sombre, pour les modules « profonds ». */
  midnight: "from-accent-600 to-accent-900",
  /** Rose clair vers orange clair. */
  blossom: "from-blush-400 to-brand-400",
  /** Violet vers prune, pour les modules nocturnes. */
  eclipse: "from-accent-500 to-ink-700",
  /** Rose soutenu. */
  magenta: "from-brand-500 to-blush-600",
  /** Doré, pour les modules de compétition. */
  gold: "from-amber-400 to-brand-500",
  /** Violet vers rose clair. */
  orchid: "from-blush-400 to-accent-400",
} as const;

export type GradientKey = keyof typeof MODULE_GRADIENTS;

/** Renvoie les classes Tailwind d'une clé de dégradé. */
export function gradientClass(key: GradientKey): string {
  return MODULE_GRADIENTS[key];
}
