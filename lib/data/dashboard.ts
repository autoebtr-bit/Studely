import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { KHOLLES_OFFERTES } from "@/lib/billing/plans";

/** Ce dont le tableau de bord a besoin, en une seule lecture. */
export interface DashboardStats {
  /** Khôlles blanches encore disponibles, offertes comprises. */
  kholleCredits: number;
  /** Khôlles déjà passées. Zéro = compte neuf. */
  kholleCount: number;
  /** XP gagnée sur les sept derniers jours. */
  xpThisWeek: number;
  /** Chapitres commencés mais pas terminés. */
  chaptersInProgress: number;
}

const EMPTY: DashboardStats = {
  kholleCredits: 0,
  kholleCount: 0,
  xpThisWeek: 0,
  chaptersInProgress: 0,
};

/**
 * Ce que montre l'application quand aucune base n'est configurée.
 *
 * Surtout pas `EMPTY` : avec zéro crédit, le tableau de bord annoncerait
 * « ton essai est terminé » à quelqu'un qui n'a jamais eu de compte. Sans base,
 * l'écran illustre ce que voit un nouvel inscrit — donc ses khôlles offertes.
 */
const NOUVEAU_COMPTE: DashboardStats = { ...EMPTY, kholleCredits: KHOLLES_OFFERTES };

export async function readDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured()) return NOUVEAU_COMPTE;

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return EMPTY;

    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [balance, kholles, xp, chapters] = await Promise.all([
      supabase.rpc("kholle_balance").single(),
      supabase
        .from("kholle_sessions")
        .select("id", { count: "exact", head: true }),
      supabase.from("xp_events").select("amount").gte("created_at", weekAgo),
      supabase.from("chapters").select("progress_pct"),
    ]);

    const credits =
      (balance.data?.credits ?? 0) + (balance.data?.remaining ?? 0);

    return {
      kholleCredits: credits,
      kholleCount: kholles.count ?? 0,
      xpThisWeek: (xp.data ?? []).reduce((sum, e) => sum + e.amount, 0),
      chaptersInProgress: (chapters.data ?? []).filter(
        (c) => c.progress_pct > 0 && c.progress_pct < 100,
      ).length,
    };
  } catch {
    // Un tableau de bord incomplet vaut mieux qu'un écran d'erreur.
    return EMPTY;
  }
}
