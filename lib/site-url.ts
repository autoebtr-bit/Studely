/**
 * Adresse publique du site.
 *
 * Trois usages, et ils doivent tous donner la même réponse : la base des
 * métadonnées (`metadataBase`), les URL de retour après paiement, et les liens
 * des e-mails transactionnels. Les laisser diverger enverrait un client payant
 * sur une page inexistante juste après avoir réglé.
 *
 * **Le problème que ce module résout est un œuf et une poule.** L'adresse n'est
 * connue qu'une fois le site déployé, mais le déploiement a besoin de
 * l'adresse. Exiger une variable renseignée à la main fait donc échouer le tout
 * premier déploiement — ce qui est arrivé :
 *
 *     TypeError: Invalid URL … input: ''
 *
 * D'où la cascade ci-dessous, qui se débrouille seule sur Vercel et n'exige une
 * valeur manuelle que pour un domaine personnalisé.
 *
 * Pourquoi tester `trim()` et pas seulement `??` : une variable **déclarée mais
 * vide** est une chaîne vide, pas `undefined`. L'opérateur `??` la laisse
 * passer, et `new URL("")` lève. C'est exactement ce qui a cassé le build.
 */

import { cleanEnv as clean } from "@/lib/env";

export function siteUrl(): string {
  // 1. Valeur explicite. La seule à faire foi dès qu'un domaine propre existe :
  //    les adresses `.vercel.app` changent, un domaine acheté ne change pas.
  const explicit = clean(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit.replace(/\/$/, "");

  // 2. Domaine de production attribué par l'hébergeur. Stable d'un déploiement
  //    à l'autre, contrairement au suivant.
  const production = clean(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (production) return `https://${production}`;

  // 3. Adresse du déploiement courant. Propre à CHAQUE déploiement, y compris
  //    les prévisualisations : utile en dernier recours, jamais comme
  //    référence durable.
  const deployment = clean(process.env.VERCEL_URL);
  if (deployment) return `https://${deployment}`;

  // 4. Développement local.
  return "http://localhost:3000";
}
