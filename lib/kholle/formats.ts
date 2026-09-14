/**
 * Formats de khôlle.
 *
 * Une khôlle n'a pas le même déroulé selon la filière : en maths c'est une
 * question de cours puis un exercice au tableau ; en ESH un exposé structuré ;
 * en langues un compte rendu d'article. Décrire ces formats en données plutôt
 * qu'en code permet de servir toutes les filières sans dupliquer le moteur —
 * ajouter une filière, c'est ajouter une entrée ici.
 *
 * Chaque format porte aussi la consigne donnée à l'examinateur et ses critères
 * de notation : ce sont eux qui font la différence entre une conversation polie
 * et une vraie khôlle.
 */

export type Discipline =
  | "maths"
  | "physique-chimie"
  | "svt"
  | "esh"
  | "geopolitique"
  | "langues"
  | "lettres"
  | "philosophie"
  | "histoire-geo"
  | "transversal";

/** Une phase du déroulé. Les phases s'enchaînent dans l'ordre déclaré. */
export interface KhollePhase {
  id: string;
  label: string;
  minutes: number;
  /** Ce que l'élève doit produire, affiché avant le démarrage de la phase. */
  instruction: string;
  /**
   * L'examinateur coupe-t-il pendant cette phase ?
   * C'est ce qui distingue une récitation d'une vraie mise en difficulté.
   */
  interruptive: boolean;
  /** Part de la note finale, en pourcentage. La somme des phases fait 100. */
  weight: number;
}

/** Critère de notation propre au format. */
export interface KholleCriterion {
  id: string;
  label: string;
  /** Ce que l'examinateur observe concrètement. */
  description: string;
  weight: number;
}

export interface KholleFormat {
  id: string;
  label: string;
  /** Filières concernées, en clair, pour l'écran de choix. */
  filieres: string[];
  discipline: Discipline;
  totalMinutes: number;
  phases: KhollePhase[];
  criteria: KholleCriterion[];
  /**
   * Consigne d'examinateur, injectée dans le prompt système.
   * Décrit ce que ce khôlleur-là traque en priorité.
   */
  examinerBrief: string;
  /**
   * Les questions de cours de cette discipline sont-elles énumérables à partir
   * du programme ? Quand c'est vrai, on peut prédire ce qui tombe ; sinon la
   * valeur est ailleurs (fluidité, structure du propos).
   */
  predictable: boolean;
}

export const KHOLLE_FORMATS: KholleFormat[] = [
  /* ------------------------------------------------ Prépa scientifique -- */
  {
    id: "sciences-cours-exercice",
    label: "Question de cours puis exercice",
    filieres: ["MPSI", "PCSI", "MP", "PC", "PSI", "PT", "BCPST", "MP2I"],
    discipline: "maths",
    totalMinutes: 30,
    predictable: true,
    phases: [
      {
        id: "cours",
        label: "Question de cours",
        minutes: 8,
        instruction:
          "Énonce le résultat demandé avec toutes ses hypothèses, puis démontre-le. " +
          "Une hypothèse oubliée invalide l'énoncé.",
        // Interruptible, parce que `examinerBrief` le promet mot pour mot :
        // « si une hypothèse manque, tu le relèves immédiatement ». C'est aussi
        // ce que fait un vrai khôlleur — laisser réciter un énoncé faux
        // jusqu'au bout n'apprend rien.
        interruptive: true,
        weight: 40,
      },
      {
        id: "exercice",
        label: "Exercice au tableau",
        minutes: 22,
        instruction:
          "Cherche à voix haute. Dis ce que tu essaies et pourquoi, même quand " +
          "tu bloques — c'est le raisonnement qui est noté, pas la vitesse.",
        interruptive: true,
        weight: 60,
      },
    ],
    criteria: [
      {
        id: "exactitude",
        label: "Exactitude des énoncés",
        description:
          "Hypothèses complètes, quantificateurs corrects, pas de confusion entre condition nécessaire et suffisante.",
        weight: 30,
      },
      {
        id: "rigueur",
        label: "Rigueur de la démonstration",
        description:
          "Chaque étape est justifiée. Les passages à la limite et les interversions sont légitimés.",
        weight: 25,
      },
      {
        id: "initiative",
        label: "Initiative sur l'exercice",
        description:
          "L'élève propose des pistes de lui-même au lieu d'attendre d'être guidé.",
        weight: 25,
      },
      {
        id: "reaction",
        label: "Réaction aux relances",
        description:
          "Face à une objection, l'élève reprend son raisonnement plutôt que de se braquer ou de s'effondrer.",
        weight: 20,
      },
    ],
    examinerBrief:
      "Tu es khôlleur en prépa scientifique. Tu es exigeant mais jamais humiliant.\n" +
      "- Sur la question de cours, tu es impitoyable sur les hypothèses : si une hypothèse manque, tu le relèves immédiatement.\n" +
      "- Sur l'exercice, tu laisses chercher. Tu n'interviens que si l'élève est bloqué depuis longtemps ou part sur une fausse piste.\n" +
      "- Tu relances par des questions, jamais par la réponse : « êtes-vous sûr ? », « que se passe-t-il si on retire cette hypothèse ? », « pourquoi ce passage à la limite est-il licite ? »\n" +
      "- Un élève qui se corrige seul après une relance vaut mieux qu'un élève qui n'a pas commis l'erreur mais récite.",
  },

  {
    id: "sciences-physique",
    label: "Question de cours puis application",
    filieres: ["MPSI", "PCSI", "MP", "PC", "PSI", "BCPST"],
    discipline: "physique-chimie",
    totalMinutes: 30,
    predictable: true,
    phases: [
      {
        id: "cours",
        label: "Question de cours",
        minutes: 8,
        instruction:
          "Énonce la loi ou le modèle, précise son domaine de validité et les " +
          "hypothèses physiques qui le rendent applicable.",
        interruptive: false,
        weight: 35,
      },
      {
        id: "application",
        label: "Application",
        minutes: 22,
        instruction:
          "Pose le problème avant de calculer : schéma, système étudié, " +
          "référentiel, bilan. Vérifie l'homogénéité de tes résultats.",
        interruptive: true,
        weight: 65,
      },
    ],
    criteria: [
      {
        id: "modele",
        label: "Choix du modèle",
        description:
          "Le modèle retenu est justifié et son domaine de validité est énoncé.",
        weight: 30,
      },
      {
        id: "mise-en-place",
        label: "Mise en place du problème",
        description:
          "Système, référentiel et bilan sont posés avant tout calcul.",
        weight: 25,
      },
      {
        id: "homogeneite",
        label: "Contrôle des résultats",
        description:
          "Homogénéité, ordres de grandeur et cas limites sont vérifiés spontanément.",
        weight: 25,
      },
      {
        id: "reaction",
        label: "Réaction aux relances",
        description: "L'élève reprend son raisonnement quand on le questionne.",
        weight: 20,
      },
    ],
    examinerBrief:
      "Tu es khôlleur de physique-chimie en prépa.\n" +
      "- Tu exiges que le domaine de validité soit énoncé, pas seulement la formule.\n" +
      "- Tu demandes systématiquement une vérification d'homogénéité et un ordre de grandeur.\n" +
      "- Tu relèves toute application d'un modèle hors de son domaine.\n" +
      "- Tu demandes le schéma et le système étudié avant d'accepter le moindre calcul.",
  },

  /* ---------------------------------------------------- Prépa commerce -- */
  {
    id: "ecg-expose",
    label: "Exposé puis entretien",
    filieres: ["ECG", "ECT", "khâgne B/L"],
    discipline: "esh",
    totalMinutes: 30,
    predictable: false,
    phases: [
      {
        id: "preparation",
        label: "Préparation",
        minutes: 0,
        instruction:
          "Tu reçois le sujet. Construis une problématique et un plan en deux " +
          "ou trois parties avant de commencer à parler.",
        interruptive: false,
        weight: 0,
      },
      {
        id: "expose",
        label: "Exposé",
        minutes: 18,
        instruction:
          "Annonce ta problématique et ton plan, puis développe. Chaque partie " +
          "doit s'appuyer sur des mécanismes, des auteurs et des faits datés.",
        interruptive: false,
        weight: 65,
      },
      {
        id: "entretien",
        label: "Entretien",
        minutes: 12,
        instruction:
          "Le jury creuse tes affirmations et teste les limites de ta thèse.",
        interruptive: true,
        weight: 35,
      },
    ],
    criteria: [
      {
        id: "problematique",
        label: "Problématique",
        description:
          "Le sujet est problématisé, pas récité. La tension du sujet est identifiée.",
        weight: 30,
      },
      {
        id: "structure",
        label: "Structure du propos",
        description:
          "Plan annoncé et tenu, transitions explicites, conclusion qui répond.",
        weight: 25,
      },
      {
        id: "references",
        label: "Références mobilisées",
        description:
          "Auteurs, mécanismes et faits datés, mobilisés à propos et non plaqués.",
        weight: 25,
      },
      {
        id: "entretien",
        label: "Tenue en entretien",
        description:
          "L'élève nuance sans renier, et reconnaît une limite quand elle est réelle.",
        weight: 20,
      },
    ],
    examinerBrief:
      "Tu es examinateur d'un oral d'ESH ou de géopolitique en prépa commerce.\n" +
      "- Tu sanctionnes le catalogue : une suite d'auteurs sans mécanisme ne vaut rien.\n" +
      "- Tu exiges des faits datés et chiffrés, pas des généralités.\n" +
      "- En entretien, tu cherches la contradiction interne du propos et tu la fais constater.\n" +
      "- Tu valorises un candidat qui reconnaît une limite plutôt qu'un candidat qui s'entête.",
  },

  /* ------------------------------------------------------------ Langues -- */
  {
    id: "langues-compte-rendu",
    label: "Compte rendu puis commentaire",
    filieres: ["Toutes filières", "LV1", "LV2"],
    discipline: "langues",
    totalMinutes: 25,
    predictable: false,
    phases: [
      {
        id: "compte-rendu",
        label: "Compte rendu",
        minutes: 8,
        instruction:
          "Restitue l'essentiel du texte dans la langue cible, sans le paraphraser " +
          "phrase à phrase. Dégage la thèse et l'enjeu.",
        interruptive: false,
        weight: 35,
      },
      {
        id: "commentaire",
        label: "Commentaire",
        minutes: 10,
        instruction:
          "Prends position, replace le texte dans son contexte et élargis vers " +
          "une problématique de civilisation.",
        interruptive: false,
        weight: 40,
      },
      {
        id: "discussion",
        label: "Discussion",
        minutes: 7,
        instruction: "L'examinateur te questionne sur le fond et sur la langue.",
        interruptive: true,
        weight: 25,
      },
    ],
    criteria: [
      {
        id: "correction",
        label: "Correction de la langue",
        description: "Grammaire, temps, prépositions, richesse lexicale.",
        weight: 30,
      },
      {
        id: "aisance",
        label: "Aisance et débit",
        description:
          "Le propos est fluide, sans lecture ni silences prolongés.",
        weight: 25,
      },
      {
        id: "synthese",
        label: "Qualité du compte rendu",
        description:
          "L'essentiel est dégagé, sans paraphrase ni recopiage du texte.",
        weight: 25,
      },
      {
        id: "civilisation",
        label: "Ancrage civilisationnel",
        description:
          "Le commentaire mobilise un contexte réel, pas des généralités.",
        weight: 20,
      },
    ],
    examinerBrief:
      "Tu es examinateur d'une khôlle de langue.\n" +
      "- Tu relèves les fautes de langue au fil de l'eau mais tu ne coupes pas le fil du propos.\n" +
      "- Tu sanctionnes la paraphrase : un compte rendu n'est pas une traduction.\n" +
      "- En discussion, tu poses des questions de civilisation qui exigent des faits concrets.\n" +
      "- Tu conduis toute la khôlle dans la langue cible.",
  },

  /* ------------------------------------------------------------ Lettres -- */
  {
    id: "lettres-explication",
    label: "Explication de texte puis entretien",
    filieres: ["Khâgne", "Hypokhâgne", "Lettres"],
    discipline: "lettres",
    totalMinutes: 30,
    predictable: false,
    phases: [
      {
        id: "explication",
        label: "Explication linéaire",
        minutes: 18,
        instruction:
          "Situe le texte, annonce un projet de lecture, puis explique en suivant " +
          "le mouvement du texte. Appuie chaque analyse sur un procédé précis.",
        interruptive: false,
        weight: 65,
      },
      {
        id: "entretien",
        label: "Entretien",
        minutes: 12,
        instruction:
          "L'examinateur revient sur des passages et élargit à l'œuvre.",
        interruptive: true,
        weight: 35,
      },
    ],
    criteria: [
      {
        id: "projet",
        label: "Projet de lecture",
        description:
          "Une lecture est proposée et tenue, au lieu d'un relevé de procédés.",
        weight: 30,
      },
      {
        id: "precision",
        label: "Précision de l'analyse",
        description:
          "Chaque affirmation s'appuie sur un élément du texte réellement cité.",
        weight: 30,
      },
      {
        id: "mouvement",
        label: "Respect du mouvement",
        description: "L'explication suit le texte sans le désorganiser.",
        weight: 20,
      },
      {
        id: "entretien",
        label: "Tenue en entretien",
        description: "L'élève sait élargir à l'œuvre et au contexte.",
        weight: 20,
      },
    ],
    examinerBrief:
      "Tu es examinateur d'une explication de texte en khâgne.\n" +
      "- Tu refuses le relevé de procédés sans interprétation.\n" +
      "- Tu demandes systématiquement de citer le texte à l'appui d'une affirmation.\n" +
      "- En entretien, tu élargis à l'œuvre entière et au mouvement littéraire.",
  },

  /* ------------------------------------------------------- Grand Oral -- */
  {
    id: "grand-oral",
    label: "Grand Oral du baccalauréat",
    filieres: ["Terminale générale", "Terminale technologique"],
    discipline: "transversal",
    totalMinutes: 20,
    predictable: false,
    phases: [
      {
        id: "expose",
        label: "Exposé de la question",
        minutes: 10,
        instruction:
          "Présente ta question, explique pourquoi tu l'as choisie et développe " +
          "ta réponse. Tu parles debout, sans notes.",
        interruptive: false,
        weight: 50,
      },
      {
        id: "echange",
        label: "Échange avec le jury",
        minutes: 10,
        instruction:
          "Le jury approfondit ta question et la relie à ton projet d'orientation.",
        interruptive: true,
        weight: 50,
      },
    ],
    criteria: [
      {
        id: "clarte",
        label: "Clarté du propos",
        description: "La question est comprise dès les premières phrases.",
        weight: 30,
      },
      {
        id: "solidite",
        label: "Solidité des connaissances",
        description:
          "Les notions de spécialité sont maîtrisées et employées à propos.",
        weight: 30,
      },
      {
        id: "engagement",
        label: "Engagement personnel",
        description:
          "Le lien avec le parcours et le projet du candidat est sincère et argumenté.",
        weight: 20,
      },
      {
        id: "interaction",
        label: "Qualité de l'échange",
        description: "Le candidat écoute la question posée et y répond vraiment.",
        weight: 20,
      },
    ],
    examinerBrief:
      "Tu es membre du jury d'un Grand Oral du baccalauréat.\n" +
      "- Tu es bienveillant : ce candidat a dix-sept ans et c'est souvent son premier oral.\n" +
      "- Tu vérifies que les notions de spécialité sont comprises, pas récitées.\n" +
      "- Tu poses des questions ouvertes et tu laisses le temps de réfléchir.\n" +
      "- Tu t'intéresses sincèrement au lien avec le projet d'orientation.",
  },
];

const BY_ID = new Map(KHOLLE_FORMATS.map((f) => [f.id, f]));

export function getFormat(id: string): KholleFormat | undefined {
  return BY_ID.get(id);
}

/** Formats proposés pour une discipline donnée. */
export function formatsForDiscipline(discipline: Discipline): KholleFormat[] {
  return KHOLLE_FORMATS.filter((f) => f.discipline === discipline);
}

/** Toutes les filières couvertes, dédoublonnées, pour l'écran de choix. */
export function allFilieres(): string[] {
  return [...new Set(KHOLLE_FORMATS.flatMap((f) => f.filieres))].sort();
}

/** Phases réellement jouées : celles qui durent plus de zéro minute. */
export function playablePhases(format: KholleFormat): KhollePhase[] {
  return format.phases.filter((p) => p.minutes > 0);
}
