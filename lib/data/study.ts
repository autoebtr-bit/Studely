import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  AppExercise,
  AppFlashcard,
  AppPodcast,
  AppStudySession,
} from "./types";

/**
 * Ce qui sert à réviser : fiches, exercices, podcasts, séances de planning.
 *
 * Comme `lib/data/courses.ts`, chaque lecture renvoie vide plutôt que de lever.
 * Sur un compte neuf, l'absence de données est l'état normal.
 */

// Les formes et libellés vivent dans `./types`, sans `server-only` : les
// composants client en ont besoin.
export type {
  AppFlashcard,
  AppExercise,
  AppPodcast,
  AppStudySession,
  SessionType,
} from "./types";

/* -------------------------------------------------------------- Fiches -- */

/** Cartes à revoir, éventuellement limitées à un chapitre. */
export async function readDueFlashcards(
  chapterId?: string,
): Promise<AppFlashcard[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();

    const { data: states } = await supabase
      .from("flashcard_states")
      .select("card_id, due_at, ease, interval_days, reps, lapses")
      .lte("due_at", new Date().toISOString())
      .order("due_at");

    if (!states?.length) return [];

    let query = supabase
      .from("flashcards")
      .select("id, chapter_id, front, back")
      .in("id", states.map((s) => s.card_id));

    if (chapterId) query = query.eq("chapter_id", chapterId);

    const { data: cards } = await query;
    if (!cards?.length) return [];

    const byCard = new Map(states.map((s) => [s.card_id, s]));

    // On garde l'ordre d'échéance : la carte la plus en retard passe en premier.
    return cards
      .map((c) => {
        const state = byCard.get(c.id);
        return {
          id: c.id,
          chapterId: c.chapter_id,
          front: c.front,
          back: c.back,
          dueAt: state?.due_at ?? null,
          srs: {
            ease: state?.ease ?? 2.5,
            intervalDays: state?.interval_days ?? 0,
            reps: state?.reps ?? 0,
            lapses: state?.lapses ?? 0,
          },
        };
      })
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  } catch {
    return [];
  }
}

/* ----------------------------------------------------------- Exercices -- */

export async function readExercises(): Promise<AppExercise[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();

    const [{ data: exercises }, { data: attempts }] = await Promise.all([
      supabase
        .from("exercises")
        .select("id, chapter_id, prompt, difficulty, minutes")
        .order("created_at", { ascending: false }),
      supabase.from("exercise_attempts").select("exercise_id, score"),
    ]);

    if (!exercises?.length) return [];

    // « Réussi » = au moins une tentative notée 10 ou plus, le seuil usuel.
    const solved = new Set(
      (attempts ?? [])
        .filter((a) => (a.score ?? 0) >= 10)
        .map((a) => a.exercise_id),
    );

    return exercises.map((e) => ({
      id: e.id,
      chapterId: e.chapter_id,
      prompt: e.prompt,
      difficulty: e.difficulty,
      minutes: e.minutes,
      solved: solved.has(e.id),
    }));
  } catch {
    return [];
  }
}

export async function readExercise(id: string): Promise<AppExercise | null> {
  const all = await readExercises();
  return all.find((e) => e.id === id) ?? null;
}

/* ------------------------------------------------------------ Podcasts -- */

export async function readPodcasts(): Promise<AppPodcast[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();

    const { data } = await supabase
      .from("podcasts")
      .select("id, chapter_id, title, script, duration_est_s")
      .eq("status", "pret")
      .order("created_at", { ascending: false });

    return (data ?? []).map((p) => ({
      id: p.id,
      chapterId: p.chapter_id,
      title: p.title,
      durationEstS: p.duration_est_s,
      sectionCount: Array.isArray(p.script) ? p.script.length : 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Podcast d'un chapitre, script compris.
 *
 * Le script est un tableau de sections de texte, conformément à
 * `podcastScriptSchema` : chaque section est lue d'une traite par la synthèse
 * vocale.
 */
export async function readPodcastByChapter(chapterId: string): Promise<{
  title: string;
  script: string[];
} | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();

    const { data } = await supabase
      .from("podcasts")
      .select("title, script")
      .eq("chapter_id", chapterId)
      .eq("status", "pret")
      .maybeSingle();

    if (!data) return null;

    return {
      title: data.title,
      // Le script est du JSON libre en base : on ne retient que les entrées
      // qui sont bien du texte, plutôt que de faire confiance à sa forme.
      script: Array.isArray(data.script)
        ? data.script.filter((s): s is string => typeof s === "string")
        : [],
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ Planning -- */

export async function readStudySessions(): Promise<AppStudySession[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();

    const { data } = await supabase
      .from("study_sessions")
      .select("id, chapter_id, scheduled_on, start_time, duration_min, type, status")
      .order("scheduled_on");

    // Le décalage se calcule au jour près, heures neutralisées des deux côtés :
    // une séance prévue ce soir doit compter comme « aujourd'hui », pas comme
    // « dans 0,4 jour ».
    const today = new Date();
    const startOfToday = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    return (data ?? []).map((s) => {
      const d = new Date(`${s.scheduled_on}T00:00:00Z`);
      return {
        id: s.id,
        chapterId: s.chapter_id,
        scheduledOn: s.scheduled_on,
        startTime: s.start_time,
        durationMin: s.duration_min,
        type: s.type,
        status: s.status,
        dayOffset: Math.round((d.getTime() - startOfToday) / 86_400_000),
        done: s.status === "fait",
      };
    });
  } catch {
    return [];
  }
}
