import { describe, expect, it } from "vitest";
import { grantsPro, mapStatus } from "@/lib/billing/subscription-status";

/**
 * Traduction des statuts d'abonnement Stripe.
 *
 * Ces quelques lignes décident qui a accès aux fonctions payantes, et les deux
 * erreurs possibles n'ont pas le même prix :
 *
 * - **Refuser à tort** un abonné à jour lui fait perdre ce qu'il a payé, au
 *   moment précis où il en a besoin.
 * - **Accorder à tort** offre le service. Désagréable, mais réparable.
 *
 * D'où un statut inconnu qui retombe sur `annule`, et un impayé qui reste
 * servi : Stripe relance pendant plusieurs jours avant d'annuler, et couper un
 * élève pour un plafond de carte atteint le ferait partir alors qu'il voulait
 * payer.
 */
describe("mapStatus", () => {
  it.each([
    ["active", "actif"],
    ["trialing", "essai"],
    ["past_due", "en_retard"],
    ["unpaid", "en_retard"],
    ["canceled", "annule"],
    ["incomplete", "annule"],
    ["incomplete_expired", "annule"],
    ["paused", "annule"],
  ] as const)("%s devient %s", (stripeStatus, expected) => {
    expect(mapStatus(stripeStatus)).toBe(expected);
  });

  it("retombe sur « annulé » devant un statut inconnu", () => {
    // Un statut ajouté par Stripe ne doit jamais ouvrir l'accès par défaut.
    expect(
      mapStatus("quelque_chose_de_nouveau" as Parameters<typeof mapStatus>[0]),
    ).toBe("annule");
  });
});

describe("grantsPro", () => {
  it("ouvre l'accès à un abonnement actif ou en période d'essai", () => {
    expect(grantsPro("actif")).toBe(true);
    expect(grantsPro("essai")).toBe(true);
  });

  it("maintient l'accès pendant une relance de paiement", () => {
    expect(grantsPro("en_retard")).toBe(true);
  });

  it("ferme l'accès à un abonnement annulé", () => {
    expect(grantsPro("annule")).toBe(false);
  });
});
