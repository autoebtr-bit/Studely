import "server-only";

import Stripe from "stripe";

/**
 * Client Stripe, instancié une seule fois par processus.
 *
 * `import "server-only"` n'est pas décoratif : la clé secrète donne un accès
 * complet au compte de paiement. Toute tentative d'importer ce fichier depuis
 * un composant client fait échouer la compilation, et c'est voulu.
 */

let cached: Stripe | null = null;

/**
 * Le paiement est-il configuré ?
 *
 * Se teste avant d'afficher un bouton d'abonnement : proposer un paiement qui
 * échouera à l'ouverture de la page de règlement est pire que ne rien proposer.
 * Les trois valeurs sont nécessaires — sans identifiant de tarif, la session de
 * règlement n'a rien à vendre.
 */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_WEBHOOK_SECRET &&
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
  );
}

export function stripe(): Stripe {
  if (cached) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquante. Renseigne-la dans .env.local (voir .env.example).",
    );
  }

  cached = new Stripe(key, {
    /**
     * Version d'API figée.
     *
     * Sans cela, Stripe applique la version associée au compte, qui peut
     * changer depuis le tableau de bord : le code se mettrait à recevoir des
     * charges utiles différentes sans qu'aucune ligne n'ait bougé ici.
     */
    apiVersion: "2026-08-26.dahlia",
    /** Facilite l'identification de l'intégration dans les journaux Stripe. */
    appInfo: { name: "Studely" },
  });

  return cached;
}

/** Identifiant du tarif mensuel Pro, créé dans le tableau de bord Stripe. */
export function proPriceId(): string {
  const id = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY;
  if (!id) {
    throw new Error(
      "NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY manquante : aucun tarif à vendre.",
    );
  }
  return id;
}

/**
 * Adresse publique du site, pour les retours après paiement.
 *
 * Réexportée depuis `lib/site-url` plutôt que recalculée : Stripe exige des URL
 * absolues, et une valeur qui divergerait de celle des métadonnées renverrait
 * le client payant sur une page inexistante juste après avoir réglé — le pire
 * moment possible.
 */
export { siteUrl } from "@/lib/site-url";

/**
 * La traduction des statuts vit dans `./subscription-status`, sans
 * `server-only` : ce sont des fonctions pures, l'écran des paramètres les
 * utilise côté client, et elles doivent rester testables directement.
 */
export { grantsPro, mapStatus } from "./subscription-status";
