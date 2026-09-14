import {
  BookOpen,
  Layers,
  Mic,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { ASSISTANT } from "@/lib/assistant";
import {
  KHOLLES_OFFERTES,
  PLAN_LIMITS,
  PRO_PRICE_EUR,
} from "@/lib/billing/plans";
import { KHOLLE_FORMATS } from "@/lib/kholle/formats";
import { weightedScore, type KholleHistoryEntry } from "@/lib/kholle/history";
import { PAUSE_BEFORE_RELANCE_S } from "@/lib/kholle/timing";
import { DEFAULT_EXAMINER_NAME } from "@/lib/voice/examiners";

/**
 * Contenu de la landing page.
 *
 * Le texte est séparé du rendu : les sections bouclent sur ces tableaux plutôt
 * que de répéter du balisage. Corriger une formulation se fait ici.
 *
 * Deux règles d'écriture pour cette page :
 *  - « khôlle » dans les titres — un prépa reconnaît quelqu'un qui connaît son
 *    monde ; « colle » dans les sous-titres et la description de référencement,
 *    orthographe bien plus tapée dans un moteur de recherche.
 *  - Ne rien promettre que le produit ne fasse. Toute fonctionnalité citée ici
 *    doit correspondre à un module livré de `lib/modules/registry.ts`.
 */

export const NAV_LINKS = [
  { href: "#accueil", label: "Accueil" },
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#filieres", label: "Filières" },
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "#tarifs", label: "Tarifs" },
] as const;

/* ------------------------------------------------------------------ Hero -- */

export const HERO = {
  badge: "Pour les prépas — MPSI, PCSI, ECG, khâgne",
  titleLead: "Passe une khôlle blanche",
  titleAccent: "avant la vraie.",
  subtitle:
    "Entre le programme de colle de la semaine. Un examinateur t'interroge à l'oral : question de cours, exercice au tableau, relances quand tu déraille. Tu ressors avec une note sur 20 et la liste de ce qui a manqué.",
  primaryCta: { label: "Commencer gratuitement", href: "/signup" },
  secondaryCta: { label: "Voir une khôlle", href: "/kholle" },
} as const;

export const HERO_CALLOUTS = {
  left: {
    // Ne pas reprendre le libellé de la relance affichée dans la maquette :
    // sur grand écran les deux se lisent côte à côte.
    text: "Il te coupe dès qu'une hypothèse manque",
    avatars: [
      { emoji: "🎓", className: "bg-amber-400" },
      { emoji: "📐", className: "bg-brand-400" },
      { emoji: "🎙️", className: "bg-accent-500" },
    ],
  },
  right: {
    text: "Tu sais où tu bloques avant d'y être",
    avatars: [
      { emoji: "⏱️", className: "bg-teal-400" },
      { emoji: "💡", className: "bg-accent-400" },
      { emoji: "🎯", className: "bg-orange-400" },
    ],
  },
} as const;

/**
 * Maquette du hero : une khôlle en cours.
 *
 * C'est l'élément le plus convaincant de la page, parce qu'il montre la seule
 * chose qu'un chatbot généraliste ne fait pas. Le sujet est celui de
 * `lib/kholle/demo-subject.ts` — un vrai énoncé de première année, pas un texte
 * écrit pour la vitrine.
 */
export interface MockupPhase {
  label: string;
  state: "en-cours" | "a-venir";
}

const HERO_PHASES: MockupPhase[] = [
  { label: "Question de cours", state: "en-cours" },
  { label: "Exercice au tableau", state: "a-venir" },
];

export const HERO_MOCKUP = {
  sessionLabel: "Khôlle de maths · MPSI",
  timer: "07:58",
  phases: HERO_PHASES,
  phaseLabel: "Question de cours",
  prompt:
    "Énoncez le théorème de la limite monotone pour les suites réelles, puis démontrez-le dans le cas d'une suite croissante et majorée.",
  relance: {
    // Le khôlleur par défaut, nommé : la vitrine doit montrer exactement ce que
    // l'élève verra dans l'application.
    author: `${DEFAULT_EXAMINER_NAME} t'interrompt`,
    message: "Vous êtes sûr de vos hypothèses ? Que devient l'énoncé si la suite n'est plus majorée ?",
  },
} as const;

/* --------------------------------------------------------------- Sections -- */

/**
 * En-têtes de section.
 *
 * Ils vivaient en dur dans les composants, ce qui les avait laissés génériques
 * après le recentrage. Les regrouper ici garantit qu'une relecture du message
 * couvre réellement toute la page.
 */
export const SECTIONS = {
  probleme: {
    eyebrow: "Le constat",
    title: "La khôlle est l'épreuve qu'on prépare le plus mal",
    description:
      "Pas par manque de travail : parce qu'on ne peut pas la répéter. On révise son cours, puis on découvre l'oral le jour même.",
  },
  progression: {
    eyebrow: "Semaine après semaine",
    title: "Tu vois enfin ce qui progresse, et ce qui bloque encore",
    description:
      "Chaque khôlle laisse sa note et son détail par critère. Au bout de quelques semaines, la courbe dit ce qu'aucune impression ne dit : où tu gagnes vraiment des points, et ce que tu traînes depuis le début.",
  },
  difference: {
    eyebrow: "Ce qui change vraiment",
    title: "Poser des questions, tout le monde sait faire",
    description:
      "Faire passer une khôlle, non. Voici ce qui sépare les deux, mécanisme par mécanisme — avec les chiffres, pour que tu puisses vérifier.",
  },
  fonctionnalites: {
    eyebrow: "Ce que fait Studely",
    title: "L'épreuve, puis de quoi la préparer",
    description:
      "La khôlle blanche est le produit. Le reste existe pour qu'elle se passe bien.",
  },
  etapes: {
    eyebrow: "Chaque semaine",
    title: "Trois étapes, du programme à la fiche notée",
    description:
      "Le programme tombe le lundi, la khôlle a lieu le mercredi. C'est entre les deux que tout se joue.",
  },
  temoignages: {
    eyebrow: "Avis d'étudiants",
    title: "Ce qu'en disent des prépas",
    // Aucune revendication de volume : le produit n'a pas encore d'utilisateurs.
    description:
      "Retours d'étudiants de MPSI, d'ECG et de khâgne sur leur préparation aux khôlles.",
  },
  tarifs: {
    eyebrow: "Tarification",
    title: "Des tarifs simples et transparents",
    description: `Essaie avec ${KHOLLES_OFFERTES} khôlles blanches offertes, sans carte bancaire.`,
  },
} as const;

/**
 * Pavé d'appel à l'action final.
 *
 * Le texte vivait en dur dans le composant, ce qui l'avait laissé promettre une
 * gratuité permanente après le passage à l'essai.
 */
export const FINAL_CTA = {
  badge: "Ta prochaine khôlle est dans quelques jours",
  title: "Passe-la une fois pour de faux, d'abord.",
  description: `Vingt minutes ce soir, et tu sauras exactement ce qu'il te reste à revoir. ${KHOLLES_OFFERTES} khôlles offertes, sans carte bancaire.`,
  cta: { label: "Commencer l'essai", href: "/signup" },
} as const;

/* --------------------------------------------------------------- Problème -- */

export interface ProblemItem {
  emoji: string;
  title: string;
  description: string;
  /** Teinte de la pastille d'icône. */
  tint: string;
}

export const PROBLEMS: ProblemItem[] = [
  {
    emoji: "🪑",
    title: "On ne peut pas s'entraîner seul",
    description:
      "Un écrit, tu le révises seul. Un oral, il faut quelqu'un en face pour te poser les questions, t'interrompre et te laisser chercher. Ce quelqu'un n'est jamais disponible à 22 h.",
    tint: "bg-red-100 text-red-600",
  },
  {
    emoji: "🫥",
    title: "Connaître son cours ne suffit pas",
    description:
      "Tu relis ta démonstration, tout est clair. Au tableau, la première hypothèse t'échappe et le silence s'installe. Savoir lire un théorème et savoir le dire sont deux compétences différentes.",
    tint: "bg-amber-100 text-amber-600",
  },
  {
    emoji: "🎲",
    title: "On ne sait pas ce qui va tomber",
    description:
      "Le programme annonce des chapitres, pas la question. Tu révises tout un peu, donc rien à fond — et tu tombes sur la seule démonstration que tu avais survolée.",
    tint: "bg-accent-100 text-accent-600",
  },
];

/* ----------------------------------------------------------- Progression -- */

/**
 * Historique d'exemple pour illustrer la courbe de progression.
 *
 * **Ce sont des chiffres inventés**, et la section l'annonce explicitement.
 * Ils vivent ici et nulle part ailleurs : c'est la vitrine qui illustre à un
 * visiteur. L'application, elle, n'affiche que de vraies données.
 *
 * Les identifiants de critère sont ceux du format `sciences-cours-exercice` —
 * le même composant que dans l'application les affiche, donc ils doivent être
 * justes sous peine de ne rien tracer.
 *
 * La progression montrée est modeste et non monotone : 11, 13, 12, 16. Une
 * courbe qui monterait tout droit sonnerait faux, et ce n'est pas ainsi qu'on
 * progresse à l'oral.
 */
const DEMO_FORMAT_ID = "sciences-cours-exercice";

/**
 * Quatre semaines de khôlles, du premier oral raté à un oral solide.
 *
 * Ce qui vend n'est pas le niveau atteint, c'est **l'écart** : le départ reste
 * bas — 9,5, la note d'un élève qui connaît son cours mais s'effondre à l'oral,
 * celui à qui on s'adresse — et l'arrivée est nettement bonne.
 *
 * Le plafond s'arrête à 17 sur un critère. Afficher 19 ne ferait envie à
 * personne : un prépa sait ce que vaut un 19 en khôlle, et une promesse
 * invraisemblable décrédibilise toute la page.
 *
 * La courbe n'est pas non plus une ligne droite. La troisième semaine plafonne,
 * parce que c'est ainsi qu'on progresse à l'oral — une ascension parfaite
 * sonnerait faux.
 */
const DEMO_WEEKS: {
  date: string;
  criteria: { criterionId: string; score: number }[];
}[] = [
  {
    date: "2026-09-16",
    criteria: [
      { criterionId: "exactitude", score: 10 },
      { criterionId: "rigueur", score: 9 },
      { criterionId: "initiative", score: 8 },
      { criterionId: "reaction", score: 11 },
    ],
  },
  {
    date: "2026-09-23",
    criteria: [
      { criterionId: "exactitude", score: 13 },
      { criterionId: "rigueur", score: 11 },
      { criterionId: "initiative", score: 10 },
      { criterionId: "reaction", score: 13 },
    ],
  },
  {
    date: "2026-09-30",
    criteria: [
      { criterionId: "exactitude", score: 13 },
      { criterionId: "rigueur", score: 12 },
      { criterionId: "initiative", score: 11 },
      { criterionId: "reaction", score: 13 },
    ],
  },
  {
    date: "2026-10-07",
    criteria: [
      { criterionId: "exactitude", score: 17 },
      { criterionId: "rigueur", score: 15 },
      { criterionId: "initiative", score: 14 },
      { criterionId: "reaction", score: 16 },
    ],
  },
];

/**
 * La note globale est **calculée**, jamais saisie.
 *
 * Écrite à la main, elle était fausse : 14,5 annoncé au-dessus de critères qui
 * font 13,6. Devant des prépas qui calculent des moyennes pondérées toute la
 * journée, sur une section qui mise tout sur la vérifiabilité, c'était le pire
 * endroit pour une erreur d'addition.
 */
export const DEMO_KHOLLE_HISTORY: KholleHistoryEntry[] = DEMO_WEEKS.map(
  (week, i) => {
    const format = KHOLLE_FORMATS.find((f) => f.id === DEMO_FORMAT_ID);
    return {
      id: `demo-${i + 1}`,
      formatId: DEMO_FORMAT_ID,
      date: week.date,
      criteria: week.criteria,
      score: weightedScore(week.criteria, format?.criteria ?? []) ?? 0,
    };
  },
);

/* ----------------------------------------------------------- Différence -- */

export interface DifferencePoint {
  /** Chiffre servant d'ancre visuelle. Court : il se lit avant le texte. */
  figure: string;
  /** Unité ou qualificatif, sous le chiffre. */
  unit: string;
  title: string;
  description: string;
}

/**
 * Ce qui nous distingue d'un assistant généraliste.
 *
 * Deux règles de rédaction, non négociables :
 *
 *  1. **Aucun concurrent n'est nommé.** C'est la précision qui fait le
 *     contraste : « quatre secondes de silence » est une affirmation qu'une
 *     fenêtre de discussion ne peut pas reprendre à son compte.
 *  2. **Aucune promesse d'historique.** Rien n'est encore enregistré : on dit
 *     que la grille est la même d'une séance à l'autre, jamais qu'on garde la
 *     trace des précédentes. Le jour où ce sera vrai, un sixième point
 *     s'ajoutera ici.
 *
 * Les chiffres sont dérivés du moteur (`lib/kholle/formats.ts`,
 * `lib/kholle/timing.ts`) plutôt que recopiés : la page ne peut donc pas
 * annoncer un réglage que le produit n'applique plus.
 */
const MATHS = KHOLLE_FORMATS.find((f) => f.id === "sciences-cours-exercice");
const MATHS_COURS = MATHS?.phases.find((p) => p.id === "cours");
const MATHS_EXERCICE = MATHS?.phases.find((p) => p.id === "exercice");

export const DIFFERENCE_POINTS: DifferencePoint[] = [
  {
    figure: `${PAUSE_BEFORE_RELANCE_S}`,
    unit: "secondes",
    title: "Il te coupe au milieu, pas à la fin",
    description:
      "Quelques secondes de silence pendant que tu cherches, et il décide s'il intervient. Pas poliment, à la fin de ta réponse : au milieu, quand une hypothèse manque. C'est exactement ce qui fait paniquer en khôlle, donc exactement ce qu'il faut avoir déjà vécu.",
  },
  {
    figure: `${KHOLLE_FORMATS.length}`,
    unit: "formats d'épreuve",
    title: "Le déroulé de ta filière, pas un oral générique",
    description:
      `En khôlle de maths : ${MATHS_COURS?.minutes ?? 8} minutes de question de cours, ` +
      `${MATHS_EXERCICE?.minutes ?? 22} d'exercice au tableau, comptant ` +
      `${MATHS_COURS?.weight ?? 40} et ${MATHS_EXERCICE?.weight ?? 60} % de la note. ` +
      "En ECG, en langues, en khâgne, c'est un autre déroulé — et le chrono tourne pour de vrai.",
  },
  {
    figure: `${MATHS?.criteria.length ?? 4}`,
    unit: "critères pondérés",
    title: "La même grille à chaque khôlle",
    description:
      MATHS?.criteria
        .map((c) => `${c.label.toLowerCase()} ${c.weight} %`)
        .join(", ")
        .replace(/^./, (m) => m.toUpperCase()) +
      ". Ce sont les mêmes la semaine prochaine, avec les mêmes poids : une note qui veut dire quelque chose, pas une appréciation qui change d'humeur.",
  },
  {
    figure: "0",
    unit: "réponse donnée",
    title: "Il ne te souffle jamais la solution",
    description:
      "Sa consigne le lui interdit : il relance par des questions. « Vous êtes sûr ? », « que se passe-t-il si on retire cette hypothèse ? ». Un assistant cherche à t'aider. Un khôlleur cherche à savoir si tu sais.",
  },
  {
    figure: `${MATHS?.totalMinutes ?? 30}`,
    unit: "minutes à l'oral",
    title: "Tu parles, tu ne tapes pas",
    description:
      "Il énonce le sujet à voix haute, tu réponds au micro, il t'écoute. Tu choisis ton khôlleur — une voix de femme ou d'homme — et son timbre. Savoir une démonstration et savoir la dire sont deux compétences différentes ; c'est la seconde qui est notée le jour J.",
  },
];

/* --------------------------------------------------------- Fonctionnalités -- */

export interface FeatureItem {
  icon: LucideIcon;
  title: string;
  description: string;
  linkLabel: string;
  href: string;
  /** Classes du bloc d'icône. */
  iconClass: string;
  /** Couleur du lien de la carte. */
  linkClass: string;
}

export const FEATURES: FeatureItem[] = [
  {
    icon: Mic,
    title: "La khôlle blanche",
    description:
      "L'épreuve complète, à la voix : question de cours, exercice au tableau, relances de l'examinateur quand une hypothèse manque. Puis une fiche notée sur 20, critère par critère.",
    linkLabel: "Passer une khôlle",
    href: "/kholle",
    iconClass: "gradient-sunset shadow-lift",
    linkClass: "text-brand-600",
  },
  {
    icon: Layers,
    title: "Questions de cours",
    description:
      "Récite, ne reconnais pas. Les énoncés et démonstrations de ton programme reviennent à intervalles croissants, jusqu'à ce que les hypothèses sortent sans hésitation.",
    linkLabel: "Réviser les questions de cours",
    href: "/flashcards",
    iconClass: "bg-gradient-to-br from-accent-500 to-accent-700 shadow-glow",
    linkClass: "text-accent-600",
  },
  {
    icon: PenLine,
    title: "Exos au tableau",
    description:
      "Résous à voix haute, comme en khôlle. La correction porte autant sur le raisonnement et la rédaction que sur le résultat — c'est là que les points se perdent.",
    linkLabel: "S'entraîner sur un exercice",
    href: "/exercices",
    iconClass: "bg-gradient-to-br from-amber-500 to-orange-600",
    linkClass: "text-amber-600",
  },
  {
    icon: BookOpen,
    title: "Ton programme, semaine après semaine",
    description:
      "Importe ton cours en PDF ou en photo. Le planning répartit les chapitres jusqu'au concours et fait revenir ceux que tu maîtrises le moins.",
    linkLabel: "Voir le planning",
    href: "/planning",
    iconClass: "bg-gradient-to-br from-emerald-500 to-teal-600",
    linkClass: "text-teal-600",
  },
];

/* ---------------------------------------------------------------- Étapes -- */

export const STEPS = [
  {
    number: "01",
    title: "Entre le programme de la semaine",
    description:
      "Recopie ce que ton colleur a annoncé, ou importe ton cours. Plus c'est précis, plus le sujet tombera juste.",
  },
  {
    number: "02",
    title: "Passe la khôlle blanche",
    description:
      "Vingt à trente minutes à l'oral, au micro. L'examinateur pose, écoute, relance — et ne donne jamais la réponse.",
  },
  {
    number: "03",
    title: "Corrige ce qui a manqué",
    description:
      "La fiche liste les points attendus que tu n'as pas cités. Tu les retravailles avant mercredi, pas après.",
  },
] as const;

/* ----------------------------------------------------------- Témoignages -- */

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
  avatarClass: string;
}

/**
 * Aucun nom d'établissement réel, et aucune ville : une filière suffit à situer
 * le propos, tandis qu'un lycée nommément cité rattache le témoignage à un
 * établissement identifiable qui n'a rien demandé.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Je connaissais mes démonstrations, mais je séchais dès qu'on me coupait. M'entraîner à être interrompu a tout changé : je suis passé de 9 à 14 de moyenne en khôlle de maths.",
    name: "Antoine R.",
    role: "MPSI",
    initials: "AR",
    avatarClass: "bg-brand-500",
  },
  {
    quote:
      "En ECG, l'exposé se joue sur la problématique. L'entretien me pousse dans mes contradictions exactement comme le fait mon colleur d'ESH. Je ne prépare plus une khôlle sans.",
    name: "Inès B.",
    role: "ECG 2ᵉ année",
    initials: "IB",
    avatarClass: "bg-accent-600",
  },
  {
    quote:
      "Le plus utile, c'est la liste des points attendus que je n'ai pas dits. En explication de texte, ce sont toujours les mêmes oublis — je ne les voyais pas avant de les lire noir sur blanc.",
    name: "Camille D.",
    role: "Khâgne, spécialité lettres",
    initials: "CD",
    avatarClass: "bg-emerald-600",
  },
];

/* --------------------------------------------------------------- Tarifs -- */

export interface PricingPlan {
  eyebrow: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  featured: boolean;
}

/**
 * Les volumes annoncés viennent de `lib/billing/plans.ts`, jamais recopiés :
 * ils étaient écrits trois fois et avaient déjà divergé.
 *
 * Une khôlle blanche coûte une unité, fiche notée comprise. Ne jamais annoncer
 * plus que ce que `plan_limits` autorise réellement : la déception tomberait au
 * pire moment, juste après la première khôlle.
 */
export const PLANS: PricingPlan[] = [
  {
    eyebrow: "Essai",
    name: "Essai gratuit",
    tagline: "De quoi te faire ton avis, sans rien engager.",
    price: "0€",
    period: `· ${KHOLLES_OFFERTES} khôlles offertes`,
    features: [
      `${KHOLLES_OFFERTES} khôlles blanches complètes`,
      "Tous les formats : scientifique, ECG, langues, khâgne",
      "Fiche notée sur 20 après chaque khôlle",
      "Sans carte bancaire",
      "Tes fiches restent consultables ensuite",
    ],
    ctaLabel: "Commencer l'essai",
    ctaHref: "/signup",
    featured: false,
  },
  {
    eyebrow: "Concours",
    name: "Plan Pro",
    tagline: "Pour enchaîner les khôlles blanches jusqu'aux oraux.",
    price: PRO_PRICE_EUR,
    period: "/ mois, sans engagement",
    features: [
      `${PLAN_LIMITS.pro.kholles} khôlles blanches par mois`,
      "Tous les formats : scientifique, ECG, langues, khâgne",
      "Relances de l'examinateur en direct",
      "Fiche notée détaillée, critère par critère",
      `Podcasts de révision et questions à ${ASSISTANT.name}`,
    ],
    ctaLabel: "Passer au Pro",
    ctaHref: "/signup",
    featured: true,
  },
];

/* ---------------------------------------------------------------- Footer -- */

export const FOOTER_COLUMNS = [
  {
    title: "Produit",
    links: [
      { label: "Khôlle blanche", href: "#fonctionnalites" },
      { label: "Questions de cours", href: "#fonctionnalites" },
      { label: "Filières couvertes", href: "#filieres" },
      { label: "Tarifs étudiants", href: "#tarifs" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Comment ça marche", href: "#comment-ca-marche" },
      { label: "Préparer une khôlle", href: "#comment-ca-marche" },
      { label: "Avis d'étudiants", href: "#temoignages" },
    ],
  },
  {
    title: "Légal",
    // Les intitulés disent ce que la page contient réellement : « Conditions
    // générales » renvoyait aux mentions légales, qui sont un autre document,
    // et « Gestion des cookies » promettait un réglage qui n'existe pas —
    // seuls des témoins de session strictement nécessaires sont déposés.
    links: [
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Conditions de vente", href: "/cgv" },
      { label: "Politique de confidentialité", href: "/confidentialite" },
      { label: "Cookies", href: "/confidentialite" },
    ],
  },
] as const;

export const BRAND = {
  name: "Studely",
  tagline:
    "L'entraînement aux khôlles de prépa : un examinateur qui t'interroge à l'oral, t'interrompt et te note, autant de fois que tu veux.",
  madeIn: "Fait avec fierté en France",
} as const;
