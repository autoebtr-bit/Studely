import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export interface AppAchievement {
  code: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
}

/** Nombre de jours affichés dans l'histogramme d'XP. */
export const XP_HISTORY_DAYS = 30;

/**
 * XP gagnée jour par jour, du plus ancien au plus récent.
 *
 * Toujours `XP_HISTORY_DAYS` valeurs, quitte à ce qu'elles soient nulles : un
 * histogramme à trois barres sur un compte neuf serait illisible, alors qu'une
 * série de zéros montre bien qu'il n'y a rien encore.
 */
export async function readXpHistory(): Promise<number[]> {
  const days = new Array<number>(XP_HISTORY_DAYS).fill(0);
  if (!isSupabaseConfigured()) return days;

  try {
    const supabase = createClient();

    const since = new Date(Date.now() - XP_HISTORY_DAYS * 86_400_000);
    const { data } = await supabase
      .from("xp_events")
      .select("amount, created_at")
      .gte("created_at", since.toISOString());

    const today = new Date();
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();

    for (const event of data ?? []) {
      const d = new Date(event.created_at);
      const dayStart = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      ).getTime();

      // Index 0 = il y a 29 jours, dernier index = aujourd'hui.
      const index =
        XP_HISTORY_DAYS - 1 - Math.round((startOfToday - dayStart) / 86_400_000);

      if (index >= 0 && index < XP_HISTORY_DAYS) {
        days[index] = (days[index] ?? 0) + event.amount;
      }
    }
    return days;
  } catch {
    return days;
  }
}

/** Succès du catalogue, avec l'état de déblocage de l'élève. */
export async function readAchievements(): Promise<AppAchievement[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();

    const [{ data: catalogue }, { data: unlocked }] = await Promise.all([
      supabase.from("achievements").select("code, title, description, emoji"),
      supabase.from("user_achievements").select("achievement_code"),
    ]);

    if (!catalogue?.length) return [];

    const owned = new Set((unlocked ?? []).map((u) => u.achievement_code));

    return catalogue.map((a) => ({
      code: a.code,
      title: a.title,
      description: a.description,
      emoji: a.emoji,
      unlocked: owned.has(a.code),
    }));
  } catch {
    return [];
  }
}
