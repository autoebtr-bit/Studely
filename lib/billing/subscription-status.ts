/**
 * Statuts d'abonnement, et ce qu'ils ouvrent.
 *
 * Volontairement **sans** `server-only` : ce sont des fonctions pures, sans
 * clé ni accès réseau, et l'écran des paramètres en a besoin côté client. Les
 * laisser dans `lib/billing/stripe.ts` les rendait intestables autrement qu'en
 * simulant la frontière serveur, pour aucun gain de sécurité.
 */

/** Statuts tels qu'ils sont stockés, miroir de l'énumération Postgres. */
export type SubscriptionStatus = "actif" | "essai" | "en_retard" | "annule";

/** Statuts d'abonnement renvoyés par Stripe. */
export type StripeStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/**
 * Traduction d'un statut Stripe vers le nôtre.
 *
 * Fermée par défaut : un statut inconnu — Stripe peut en ajouter — retombe sur
 * `annule`. Le défaut prudent est de ne pas servir, jamais d'offrir un
 * abonnement payant sur la foi d'un statut qu'on ne sait pas lire.
 */
export function mapStatus(status: StripeStatus | string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "actif";
    case "trialing":
      return "essai";
    case "past_due":
    case "unpaid":
      return "en_retard";
    default:
      return "annule";
  }
}

/**
 * Ce statut donne-t-il droit aux fonctions payantes ?
 *
 * `en_retard` reste servi : Stripe relance le paiement pendant plusieurs jours
 * avant d'annuler, et couper un élève en pleine préparation pour un plafond de
 * carte atteint le ferait partir alors qu'il voulait payer. C'est le passage en
 * `annule` qui coupe, pas le premier échec de prélèvement.
 */
export function grantsPro(status: SubscriptionStatus): boolean {
  return status !== "annule";
}
