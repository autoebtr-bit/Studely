/**
 * Identité légale de l'éditeur, et traitements de données déclarés.
 *
 * Deux natures d'information cohabitent ici, et il faut les distinguer :
 *
 * 1. **L'identité de l'éditeur** — raison sociale, SIRET, adresse, directeur de
 *    la publication. Elle n'est connue que de l'exploitant du site. Ces champs
 *    valent `À_COMPLETER` et **doivent** être renseignés avant toute mise en
 *    ligne : `tests/integration/legal.test.ts` échoue tant qu'ils ne le sont
 *    pas. Inventer un SIRET serait une fausse déclaration, bien plus grave que
 *    l'absence de la page.
 *
 * 2. **Les traitements de données** — ce que l'application collecte réellement
 *    et à qui elle le transmet. Cela se déduit du schéma et du code, donc c'est
 *    écrit ici en toutes lettres, et c'est cette partie qui a une vraie valeur
 *    juridique parce qu'elle est exacte.
 */

/** Marqueur des champs que seul l'exploitant peut renseigner. */
export const A_COMPLETER = "À_COMPLETER";

export const LEGAL_ENTITY = {
  /* ------------------------------------------------ À renseigner par vous -- */

  /** Raison sociale, ou nom et prénom si l'activité est exercée en nom propre. */
  publisher: A_COMPLETER,
  /** Forme juridique : SAS, SASU, micro-entreprise, association… */
  legalForm: A_COMPLETER,
  /** Capital social. Laisser vide si l'activité est exercée en nom propre. */
  capital: A_COMPLETER,
  /** Numéro SIRET à quatorze chiffres. */
  siret: A_COMPLETER,
  /** Numéro de TVA intracommunautaire, si assujetti. */
  vatNumber: A_COMPLETER,
  /** Adresse postale du siège, telle qu'elle est déclarée. */
  address: A_COMPLETER,
  /** Adresse de contact, qui doit être relevée : elle sert aux demandes RGPD. */
  contactEmail: A_COMPLETER,
  /** Directeur de la publication — généralement le représentant légal. */
  publicationDirector: A_COMPLETER,
  /** Hébergeur du site : nom, adresse, téléphone. Dépend du déploiement. */
  host: A_COMPLETER,

  /* -------------------------------------------------------------- Connus -- */

  siteName: "Studely",
} as const;

/**
 * Sous-traitants au sens du RGPD.
 *
 * Liste établie depuis le code, pas depuis un modèle : chaque entrée correspond
 * à un service réellement appelé. Stripe y figure déjà parce qu'il arrive avec
 * l'abonnement — à retirer s'il ne devait pas être mis en place.
 */
export interface Processor {
  name: string;
  purpose: string;
  /** Où les données sont hébergées ou traitées. */
  location: string;
}

export const PROCESSORS: Processor[] = [
  {
    name: "Supabase",
    purpose:
      "Hébergement de la base de données, authentification, et stockage des documents de cours déposés.",
    location: "Union européenne (région choisie à la création du projet).",
  },
  {
    name: "Anthropic",
    purpose:
      "Traitement par intelligence artificielle : analyse des cours déposés, génération des sujets de khôlle, des fiches, des exercices et des corrections.",
    location:
      "États-Unis, sur la base de clauses contractuelles types. Les contenus transmis ne servent pas à entraîner de modèle.",
  },
  {
    name: "Stripe",
    purpose:
      "Encaissement des abonnements. Aucune donnée bancaire ne transite par nos serveurs ni n'y est conservée.",
    location: "Union européenne et États-Unis.",
  },
];

/**
 * Catégories de données traitées.
 *
 * Dérivées des tables réellement écrites par l'application — `profiles`,
 * `subjects`, `documents`, `lessons`, `flashcard_states`, `exercise_attempts`,
 * `kholle_sessions`, `xp_events`, `ai_usage_log`. Une politique qui énumère des
 * données qu'on ne collecte pas est aussi fausse qu'une qui en oublie.
 */
export interface DataCategory {
  title: string;
  items: string;
  basis: string;
  retention: string;
}

export const DATA_CATEGORIES: DataCategory[] = [
  {
    title: "Compte",
    items:
      "Adresse e-mail, mot de passe (conservé sous forme chiffrée, jamais en clair), date de création du compte.",
    basis: "Exécution du contrat : sans compte, le service ne peut pas fonctionner.",
    retention: "Jusqu'à la suppression du compte.",
  },
  {
    title: "Profil scolaire",
    items:
      "Niveau d'études, date de concours, matières suivies, prénom si renseigné.",
    basis: "Exécution du contrat : ces éléments calibrent les sujets et le planning.",
    retention: "Jusqu'à la suppression du compte.",
  },
  {
    title: "Contenus déposés",
    items:
      "Documents de cours téléversés (PDF, photos, texte), et les leçons qui en sont extraites.",
    basis: "Exécution du contrat, à votre initiative : rien n'est déposé sans votre action.",
    retention:
      "Jusqu'à leur suppression par vous, ou à la suppression du compte.",
  },
  {
    title: "Activité d'apprentissage",
    items:
      "Réponses aux fiches de révision, copies rendues et leurs corrections, transcriptions et notes des khôlles blanches, séances de planning, points d'expérience.",
    basis: "Exécution du contrat : c'est la matière même du suivi de progression.",
    retention: "Jusqu'à la suppression du compte.",
  },
  {
    title: "Usage technique",
    items:
      "Journal des appels au service d'intelligence artificielle : route appelée, volume traité, coût estimé. Aucun contenu de cours n'y est conservé.",
    basis:
      "Intérêt légitime : mesurer la consommation, faire respecter les quotas et détecter les abus.",
    retention: "Douze mois.",
  },
];

/** Âge en dessous duquel l'accord d'un parent est requis, en France. */
export const AGE_CONSENTEMENT = 15;
