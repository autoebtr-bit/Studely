/**
 * Les offres, et les volumes qui vont avec.
 *
 * Source unique : ces nombres étaient jusqu'ici écrits trois fois — dans le SQL
 * (`supabase/migrations/`), dans les textes de la vitrine et en toutes lettres
 * dans l'écran des paramètres. Ils avaient déjà divergé.
 *
 * Le SQL reste la seule autorité à l'exécution : une fonction Postgres ne peut
 * pas importer du TypeScript. Cette duplication est donc assumée, mais
 * `tests/integration/plan-parity.test.ts` la verrouille — modifier un côté sans
 * l'autre fait échouer la suite, exactement comme pour le barème d'XP.
 *
 * Pourquoi ces volumes : une khôlle blanche coûte environ 0,33 € d'API
 * (`claude-opus-5`, 25 $/M en sortie, raisonnement facturé en sortie). Tout le
 * reste en découle.
 */

export type PlanTier = "gratuit" | "pro";

/** Rythme de renouvellement du budget de khôlles. */
export type KhollePeriod = "week" | "month";

export type PlanLimits = {
  tier: PlanTier;
  /** Khôlles blanches par période. Zéro = aucune allocation récurrente. */
  kholles: number;
  period: KhollePeriod;
  /** Messages à Kollia, et relances d'examinateur, par jour. */
  aiMessagesDay: number;
  /** Podcasts, lots de fiches, corrections d'exercices : par jour. */
  aiGenerationsDay: number;
};

/**
 * Khôlles offertes à l'inscription. C'est **tout l'essai** : elles ne se
 * renouvellent pas.
 *
 * Trois plutôt qu'une : il en faut deux pour sentir une différence entre la
 * première fois et la suivante, et une troisième pour essayer un autre format.
 * C'est ce qui décide de l'abonnement — à ~0,29 € la khôlle, l'essai complet
 * coûte ~0,87 €, une seule fois par inscrit.
 */
export const KHOLLES_OFFERTES = 3;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  /**
   * L'essai gratuit, une fois ses khôlles offertes dépensées.
   *
   * Tout est à zéro, et c'est l'invariant du modèle : après l'essai, plus aucun
   * appel au modèle. Rouvrir l'un de ces compteurs, même à 1 par jour, rendrait
   * le coût d'un compte non converti récurrent et sans plafond — c'est ce qui
   * rendait l'ancien plan gratuit intenable.
   *
   * Ce qui reste gratuit ne passe par aucun de ces compteurs : réviser les
   * fiches déjà produites (répétition espacée locale), relire les bilans notés,
   * le planning, la consultation des cours.
   *
   * `period` n'a plus d'objet ici, `kholles` valant zéro ; la valeur est
   * conservée pour que la forme du type reste la même d'un plan à l'autre.
   */
  gratuit: {
    tier: "gratuit",
    kholles: 0,
    period: "week",
    aiMessagesDay: 0,
    aiGenerationsDay: 0,
  },

  /**
   * Vingt par mois, soit environ cinq par semaine : très au-dessus du rythme
   * réel, donc personne ne compte. À pleine consommation l'API coûte ~6,60 €
   * pour 12,27 € nets après Stripe.
   */
  pro: {
    tier: "pro",
    kholles: 20,
    period: "month",
    aiMessagesDay: 40,
    aiGenerationsDay: 30,
  },
};

/** Prix affiché du Pro. Le montant réel vit chez Stripe, pas ici. */
export const PRO_PRICE_EUR = "12,90€";

export function planLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier];
}

/**
 * Le plan renouvelle-t-il une allocation de khôlles ?
 *
 * Faux pour l'essai : ses khôlles offertes épuisées, il n'y a pas de « prochaine
 * fois ». Les écrans doivent alors proposer l'abonnement, jamais une date.
 */
export function renews(tier: PlanTier): boolean {
  return PLAN_LIMITS[tier].kholles > 0;
}
