import type { MetadataRoute } from "next";

/**
 * Indexation par les moteurs de recherche.
 *
 * **Bloquée tant que le site n'est pas prêt à ouvrir.** Un déploiement sert
 * d'abord à obtenir une adresse — pour Stripe, pour le webhook, pour les
 * e-mails — bien avant d'accueillir du public. Or dans cet intervalle le site
 * porte encore des mentions légales incomplètes et une offre qui n'encaisse
 * pas : se faire indexer dans cet état laisse des traces durables, les moteurs
 * gardant en cache des pages longtemps après leur correction.
 *
 * **Pour ouvrir :** passer `NEXT_PUBLIC_ALLOW_INDEXING` à `"true"` dans les
 * variables d'environnement de l'hébergeur. Une variable plutôt qu'une
 * modification de code : l'ouverture au public est une décision
 * d'exploitation, et elle doit pouvoir se reprendre en trente secondes sans
 * redéployer depuis une machine.
 *
 * Ce n'est pas une protection d'accès : les robots respectueux obéissent, les
 * autres non, et l'adresse reste accessible à qui la connaît. Pour empêcher
 * réellement l'accès, il faut la protection par mot de passe de l'hébergeur.
 */
export default function robots(): MetadataRoute.Robots {
  const open = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

  if (!open) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // L'application elle-même n'a rien à faire dans un index : ces pages
        // exigent une session et ne renverraient qu'un écran de connexion.
        disallow: ["/api/", "/dashboard", "/cours", "/kholle", "/parametres"],
      },
    ],
  };
}
