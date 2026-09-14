import {
  BookOpen,
  Bot,
  CalendarDays,
  FileText,
  Headphones,
  Layers,
  Mic,
  PenLine,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { ASSISTANT } from "@/lib/assistant";
import type { GradientKey } from "./gradients";

/**
 * Source de vérité unique des modules.
 *
 * Le produit est recentré sur la khôlle : tout ce qui reste sert à la préparer.
 * Les modules de jeu (Quiz Wars, Tournoi, Mode Survie, Territoire, Bataille,
 * Millionnaire, Mots croisés, Arène, Duel) ont été retirés — ils diluaient le
 * positionnement et ne servaient pas l'épreuve.
 *
 * Un module ne choisit pas une couleur libre mais une clé de la palette
 * `lib/modules/gradients.ts`, ce qui garde l'ensemble dans l'identité de marque.
 */

export type ModuleSection = "featured" | "preparer" | "autour";

export type ModuleStatus = "live" | "soon";

export interface ModuleDef {
  /** Segment d'URL sous /app — sert aussi de clé stable partout. */
  slug: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  section: ModuleSection;
  status: ModuleStatus;
  /** Clé de la palette de dégradés partagée. */
  gradient: GradientKey;
  /** Mots-clés supplémentaires pour la recherche. */
  keywords?: string[];
  /** Affiché sur les cartes « bientôt » pour expliquer ce qui arrive. */
  soonNote?: string;
}

export const SECTION_LABELS: Record<ModuleSection, string> = {
  featured: "",
  preparer: "Préparer la khôlle",
  autour: "Autour",
};

/** Petit ornement affiché après le libellé de section. */
export const SECTION_ORNAMENTS: Partial<Record<ModuleSection, string>> = {};

export const MODULES: ModuleDef[] = [
  // --- L'épreuve ----------------------------------------------------------
  {
    slug: "kholle",
    title: "Khôlle blanche",
    subtitle: "Passe l'épreuve avant l'épreuve",
    icon: Mic,
    section: "featured",
    status: "live",
    gradient: "sunset",
    keywords: [
      "colle",
      "khôlle",
      "oral",
      "khôlleur",
      "colleur",
      "interrogation",
      "grand oral",
      "passage au tableau",
    ],
  },

  // --- Préparer -----------------------------------------------------------
  {
    slug: "cours",
    title: "Mon programme",
    subtitle: "Ce qui tombe cette semaine",
    icon: BookOpen,
    section: "preparer",
    status: "live",
    gradient: "ember",
    keywords: ["cours", "leçons", "chapitres", "matières", "programme de khôlle"],
  },
  {
    slug: "flashcards",
    title: "Questions de cours",
    subtitle: "Récite, ne reconnais pas",
    icon: Layers,
    section: "preparer",
    status: "live",
    gradient: "flame",
    keywords: [
      "définitions",
      "théorèmes",
      "démonstrations",
      "hypothèses",
      "répétition espacée",
      "flashcards",
    ],
  },
  {
    slug: "exercices",
    title: "Exos au tableau",
    subtitle: "Résous à voix haute",
    icon: PenLine,
    section: "preparer",
    status: "live",
    gradient: "amber",
    keywords: ["exercices", "entraînement", "correction", "rédaction"],
  },
  {
    slug: "prof-ia",
    title: ASSISTANT.name,
    subtitle: ASSISTANT.role,
    icon: Bot,
    section: "preparer",
    status: "live",
    gradient: "dusk",
    // Le module a changé de nom : les anciens termes restent des mots-clés,
    // sinon une recherche « prof » ne trouverait plus rien.
    keywords: [
      "kollia",
      "prof",
      "professeur",
      "question",
      "aide",
      "explication",
      "chat",
    ],
  },

  // --- Autour -------------------------------------------------------------
  {
    slug: "planning",
    title: "Planning",
    subtitle: "D'ici au concours",
    icon: CalendarDays,
    section: "autour",
    status: "live",
    gradient: "lilac",
    keywords: ["agenda", "calendrier", "organisation", "révisions"],
  },
  {
    slug: "podcast",
    title: "Podcast",
    subtitle: "Révise en écoutant",
    icon: Headphones,
    section: "autour",
    status: "live",
    gradient: "aurora",
    keywords: ["audio", "écoute", "transport", "révision passive"],
  },
  {
    slug: "annales",
    title: "Annales d'oraux",
    subtitle: "Sujets tombés aux concours",
    icon: FileText,
    section: "autour",
    status: "soon",
    gradient: "midnight",
    keywords: ["concours", "oraux", "sujets", "rapports de jury"],
    soonNote:
      "Les sujets d'oraux des concours, avec ce que les rapports de jury " +
      "reprochent année après année aux candidats.",
  },
];

/** Cartes à bordure pointillée du bas de la grille. */
export interface QuickAction {
  slug: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  status: ModuleStatus;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    slug: "importer",
    title: "Importer mon cours",
    subtitle: "PDF, photo, texte",
    icon: Upload,
    status: "live",
  },
];

const BY_SLUG = new Map(MODULES.map((m) => [m.slug, m]));

export function getModule(slug: string): ModuleDef | undefined {
  return BY_SLUG.get(slug);
}

export function modulesBySection(section: ModuleSection): ModuleDef[] {
  return MODULES.filter((m) => m.section === section);
}

export const LIVE_MODULES = MODULES.filter((m) => m.status === "live");

/** Ordre d'affichage des sections dans le tableau de bord. */
export const SECTION_ORDER: ModuleSection[] = ["preparer", "autour"];

/** Recherche simple sur titre, sous-titre et mots-clés. */
export function searchModules(query: string): ModuleDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return MODULES.filter((m) =>
    [m.title, m.subtitle, ...(m.keywords ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}
