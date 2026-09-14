import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Les cours de l'élève.
 *
 * Les formes reprennent celles des anciennes données de démonstration, qui
 * avaient été écrites au format du schéma cible : les écrans ont basculé sans
 * être réécrits.
 *
 * Toutes les fonctions renvoient une valeur vide plutôt que de lever : sur un
 * compte neuf, l'absence de données est la situation normale, pas une panne.
 * La RLS garantit qu'on ne lit jamais que ses propres lignes.
 */

export interface AppChapter {
  id: string;
  subjectId: string;
  title: string;
  progressPct: number;
  lessonCount: number;
  dueFlashcards: number;
}

export interface AppSubject {
  id: string;
  name: string;
  color: string;
  emoji: string;
  chapters: AppChapter[];
}

export interface AppLesson {
  id: string;
  chapterId: string;
  title: string;
  readingMinutes: number;
  completed: boolean;
  summary: string;
}

/** Matières avec leurs chapitres, et le nombre de fiches à revoir aujourd'hui. */
export async function readSubjects(): Promise<AppSubject[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const [{ data: subjects }, { data: chapters }, due, lessonCounts] =
      await Promise.all([
        supabase
          .from("subjects")
          .select("id, name, color, emoji, position")
          .order("position"),
        supabase
          .from("chapters")
          .select("id, subject_id, title, progress_pct, position")
          .order("position"),
        dueByChapter(supabase),
        lessonCountByChapter(supabase),
      ]);

    if (!subjects?.length) return [];

    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      emoji: s.emoji ?? "📘",
      chapters: (chapters ?? [])
        .filter((c) => c.subject_id === s.id)
        .map((c) => ({
          id: c.id,
          subjectId: c.subject_id,
          title: c.title,
          progressPct: c.progress_pct,
          lessonCount: lessonCounts.get(c.id) ?? 0,
          dueFlashcards: due.get(c.id) ?? 0,
        })),
    }));
  } catch {
    return [];
  }
}

/** Tous les chapitres, à plat — pratique pour les sélecteurs. */
export async function readChapters(): Promise<AppChapter[]> {
  const subjects = await readSubjects();
  return subjects.flatMap((s) => s.chapters);
}

export async function readChapter(
  chapterId: string,
): Promise<{ chapter: AppChapter; subject: AppSubject } | null> {
  const subjects = await readSubjects();

  for (const subject of subjects) {
    const chapter = subject.chapters.find((c) => c.id === chapterId);
    if (chapter) return { chapter, subject };
  }
  return null;
}

export async function readLessons(chapterId: string): Promise<AppLesson[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("lessons")
      .select("id, chapter_id, title, summary_md, reading_minutes, completed_at, position")
      .eq("chapter_id", chapterId)
      .order("position");

    if (error || !data) return [];

    return data.map((l) => ({
      id: l.id,
      chapterId: l.chapter_id,
      title: l.title,
      readingMinutes: l.reading_minutes,
      completed: l.completed_at !== null,
      summary: l.summary_md ?? "",
    }));
  } catch {
    return [];
  }
}

/** Nombre total de fiches à revoir aujourd'hui, tous chapitres confondus. */
export async function readDueFlashcardCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  try {
    const supabase = createClient();

    const { count, error } = await supabase
      .from("flashcard_states")
      .select("card_id", { count: "exact", head: true })
      .lte("due_at", new Date().toISOString());

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/* ----------------------------------------------------------- Agrégats -- */

type Client = ReturnType<typeof createClient>;

/**
 * Fiches à revoir, par chapitre.
 *
 * Un compte de jointure par chapitre ferait autant de requêtes que de
 * chapitres ; on ramène les cartes dues en une fois et on agrège en mémoire.
 * Le volume est celui d'un élève, pas d'une base entière.
 */
async function dueByChapter(supabase: Client): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const { data: states } = await supabase
    .from("flashcard_states")
    .select("card_id")
    .lte("due_at", new Date().toISOString());

  if (!states?.length) return counts;

  const { data: cards } = await supabase
    .from("flashcards")
    .select("id, chapter_id")
    .in("id", states.map((s) => s.card_id));

  for (const card of cards ?? []) {
    counts.set(card.chapter_id, (counts.get(card.chapter_id) ?? 0) + 1);
  }
  return counts;
}

async function lessonCountByChapter(
  supabase: Client,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  const { data } = await supabase.from("lessons").select("chapter_id");

  for (const row of data ?? []) {
    counts.set(row.chapter_id, (counts.get(row.chapter_id) ?? 0) + 1);
  }
  return counts;
}
