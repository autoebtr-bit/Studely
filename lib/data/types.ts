/**
 * Formes de données partagées entre serveur et client.
 *
 * Volontairement **sans** `server-only` : les composants client en ont besoin
 * (le tableau de planning, la session de révision), et importer une valeur
 * depuis un module serveur fait échouer la compilation.
 *
 * Ici, uniquement des types et des libellés — aucune lecture de base. Les
 * requêtes vivent dans `lib/data/*.ts`, qui sont, eux, réservés au serveur.
 */

export interface AppFlashcard {
  id: string;
  chapterId: string;
  front: string;
  back: string;
  dueAt: string | null;
  /**
   * État de répétition espacée déjà acquis par cette carte.
   *
   * Transporté jusqu'au client pour que l'aperçu « revient dans 12 j » affiché
   * sur les boutons soit exact. Sans lui, chaque carte repartirait visuellement
   * de zéro et le composant annoncerait « 1 j » à une carte révisée six fois.
   *
   * C'est bien une **prédiction** : le calcul qui fait foi est refait côté
   * serveur à partir de l'état stocké, jamais à partir de cette valeur.
   */
  srs: { ease: number; intervalDays: number; reps: number; lapses: number };
}

export interface AppExercise {
  id: string;
  chapterId: string;
  prompt: string;
  difficulty: "facile" | "moyen" | "difficile";
  minutes: number;
  solved: boolean;
}

export interface AppPodcast {
  id: string;
  chapterId: string;
  title: string;
  durationEstS: number;
  sectionCount: number;
}

export type SessionType =
  | "cours"
  | "flashcards"
  | "exercices"
  | "annale"
  | "oral";

/** Libellés des types de séance, tels qu'ils s'affichent dans le planning. */
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  cours: "Lecture de cours",
  flashcards: "Questions de cours",
  exercices: "Exercices",
  annale: "Annale",
  oral: "Khôlle blanche",
};

export interface AppStudySession {
  id: string;
  chapterId: string | null;
  scheduledOn: string;
  startTime: string | null;
  durationMin: number;
  type: SessionType;
  status: "a_faire" | "fait" | "reporte";
  /** Jours depuis aujourd'hui. 0 = aujourd'hui, négatif = en retard. */
  dayOffset: number;
  done: boolean;
}
