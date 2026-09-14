import type { KholleSubject } from "@/lib/ai/schemas";

/**
 * Sujet de démonstration, utilisé tant que les routes IA ne sont pas
 * accessibles (pas de session, pas de clé API).
 *
 * C'est une vraie khôlle de maths de première année, pas un texte d'exemple :
 * l'objectif est de pouvoir la faire passer à un étudiant de prépa et lui
 * demander « est-ce que ça ressemble ? ». Un sujet factice ne répondrait pas à
 * cette question.
 */
export const DEMO_SUBJECT: KholleSubject = {
  phases: [
    {
      phaseId: "cours",
      prompt:
        "Énoncez le théorème de la limite monotone pour les suites réelles, " +
        "puis démontrez-le dans le cas d'une suite croissante et majorée.",
      expectedPoints: [
        "La suite est à valeurs réelles",
        "Hypothèse de croissance (ou décroissance) explicitement énoncée",
        "Hypothèse de majoration (ou minoration) explicitement énoncée",
        "Conclusion : la suite converge, et sa limite est la borne supérieure de l'ensemble de ses termes",
        "Démonstration : l'ensemble des termes est non vide et majoré, donc admet une borne supérieure",
        "Utilisation de la caractérisation de la borne supérieure : pour tout epsilon strictement positif, il existe un terme supérieur à la borne moins epsilon",
        "Conclusion par la croissance : au-delà de ce rang, tous les termes sont dans l'intervalle",
      ],
      modelAnswer:
        "Toute suite réelle croissante et majorée converge, et sa limite vaut la " +
        "borne supérieure de l'ensemble de ses termes.\n\n" +
        "Démonstration. Soit (u_n) croissante et majorée. L'ensemble A = {u_n : n ∈ ℕ} " +
        "est non vide et majoré, donc admet une borne supérieure L. Soit ε > 0. " +
        "Par caractérisation de la borne supérieure, L − ε ne majore pas A : il existe " +
        "N tel que u_N > L − ε. Par croissance, pour tout n ≥ N on a u_n ≥ u_N > L − ε. " +
        "Comme L majore A, on a aussi u_n ≤ L. Donc pour tout n ≥ N, |u_n − L| < ε. " +
        "La suite converge vers L.",
    },
    {
      phaseId: "exercice",
      prompt:
        "Soit la suite définie par u_0 = 1 et, pour tout entier n, " +
        "u_(n+1) = (u_n + 2) / 3. Étudier sa convergence et déterminer sa limite.",
      expectedPoints: [
        "Recherche du point fixe : résolution de x = (x + 2) / 3, qui donne x = 1",
        "Constat que u_0 = 1 est déjà le point fixe, donc la suite est constante",
        "Justification : si u_n = 1 alors u_(n+1) = 1, récurrence immédiate",
        "Conclusion : la suite converge vers 1",
        "Ouverture : traitement du cas général u_0 quelconque, avec v_n = u_n − 1 géométrique de raison 1/3",
      ],
      modelAnswer:
        "Le point fixe vérifie x = (x + 2)/3, soit 3x = x + 2, donc x = 1.\n\n" +
        "Ici u_0 = 1 : la suite est donc constante égale à 1, ce qu'une récurrence " +
        "immédiate confirme. Elle converge vers 1.\n\n" +
        "Cas général : en posant v_n = u_n − 1, on obtient v_(n+1) = v_n / 3. " +
        "La suite (v_n) est géométrique de raison 1/3, donc tend vers 0, et " +
        "(u_n) converge vers 1 quel que soit u_0.",
    },
  ],
};

/** Programme de khôlle affiché par défaut dans le formulaire de démonstration. */
export const DEMO_PROGRAMME =
  "Suites numériques : définitions, suites arithmétiques et géométriques, " +
  "sens de variation, suites majorées et minorées, théorème de la limite " +
  "monotone, suites adjacentes, suites définies par récurrence u_(n+1) = f(u_n).";
