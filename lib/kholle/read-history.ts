import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { TREND_WINDOW, type KholleHistoryEntry } from "./history";

/**
 * Historique des khôlles de l'élève connecté, de la plus ancienne à la plus
 * récente.
 *
 * Renvoie un tableau vide dans tous les cas d'absence — pas de base branchée,
 * pas de session, aucune séance. L'écran de progression traite ce cas comme un
 * état normal, puisque c'est ce que voit tout nouvel inscrit.
 */
export async function readKholleHistory(): Promise<KholleHistoryEntry[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // Les dernières séances d'abord pour que la limite retienne les plus
    // récentes ; l'ordre est rétabli ensuite, la courbe se lisant de gauche à
    // droite dans le sens du temps.
    const { data: sessions, error } = await supabase
      .from("kholle_sessions")
      .select("id, format_id, score, created_at")
      .order("created_at", { ascending: false })
      .limit(TREND_WINDOW);

    if (error || !sessions?.length) return [];

    // Deux requêtes plutôt qu'une jointure imbriquée : `lib/supabase/types.ts`
    // est écrit à la main et ne déclare aucune relation, donc l'imbrication ne
    // se typerait pas. Le filtre porte sur le préfixe de la clé primaire.
    const { data: scores } = await supabase
      .from("kholle_criterion_scores")
      .select("session_id, criterion_id, score, comment")
      .in("session_id", sessions.map((s) => s.id));

    const bySession = new Map<string, KholleHistoryEntry["criteria"]>();
    for (const row of scores ?? []) {
      const list = bySession.get(row.session_id) ?? [];
      list.push({
        criterionId: row.criterion_id,
        score: Number(row.score),
        comment: row.comment,
      });
      bySession.set(row.session_id, list);
    }

    return sessions
      .map((row) => ({
        id: row.id,
        formatId: row.format_id,
        score: Number(row.score),
        date: row.created_at,
        criteria: bySession.get(row.id) ?? [],
      }))
      .reverse();
  } catch {
    // Une progression illisible ne doit pas empêcher d'ouvrir la page.
    return [];
  }
}
