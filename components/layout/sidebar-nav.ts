import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  FileText,
  Headphones,
  Layers,
  Mic,
  PenLine,
  Settings,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { ASSISTANT } from "@/lib/assistant";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Clé du compteur affiché à droite (résolu par le composant). */
  badgeKey?: "dueFlashcards";
}

export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

/**
 * Navigation latérale.
 *
 * L'ordre traduit le positionnement : la khôlle vient en premier, seule, puis
 * ce qui sert à la préparer. Ce n'est pas un catalogue de fonctionnalités.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [{ href: "/kholle", label: "Khôlle blanche", icon: Mic }],
  },
  {
    label: "Préparer",
    items: [
      { href: "/cours", label: "Mon programme", icon: BookOpen },
      {
        href: "/flashcards",
        label: "Questions de cours",
        icon: Layers,
        badgeKey: "dueFlashcards",
      },
      { href: "/exercices", label: "Exos au tableau", icon: PenLine },
      { href: "/prof-ia", label: ASSISTANT.name, icon: Bot },
    ],
  },
  {
    label: "Autour",
    items: [
      { href: "/planning", label: "Planning", icon: CalendarDays },
      { href: "/podcast", label: "Podcast", icon: Headphones },
      { href: "/annales", label: "Annales d'oraux", icon: FileText },
      { href: "/importer", label: "Importer", icon: Upload },
    ],
  },
  {
    label: "Compte",
    items: [
      { href: "/progression", label: "Progression", icon: BarChart3 },
      { href: "/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

/**
 * Groupe réservé à l'exploitant, ajouté à la navigation seulement pour lui.
 *
 * Séparé de `NAV_GROUPS` pour que ce lien ne puisse pas être affiché par
 * distraction : il faut le demander explicitement. Le masquer n'est toutefois
 * qu'un confort — l'autorisation réelle est rendue par les fonctions SQL du
 * tableau de bord, qui refusent de répondre à qui n'est pas administrateur,
 * quoi qu'affiche l'interface.
 */
export const ADMIN_GROUP: NavGroup = {
  label: "Exploitation",
  items: [{ href: "/admin", label: "Administration", icon: ShieldCheck }],
};

/** Navigation à afficher, selon que l'utilisateur administre ou non. */
export function navGroupsFor(isAdmin: boolean): NavGroup[] {
  return isAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS;
}
