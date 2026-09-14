"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Validation d'une séance du planning.
 *
 * Server Action plutôt qu'une route : c'est une case à cocher, pas une API, et
 * la session arrive avec la requête.
 *
 * Cocher une séance ne persistait rien : l'état vivait dans le composant et
 * disparaissait à la navigation, tandis que le badge « +15 XP » s'affichait
 * quand même. Un élève voyait donc son travail validé, son XP annoncée, et
 * retrouvait tout décoché en revenant.
 */

const inputSchema = z.object({
  sessionId: z.string().uuid(),
  done: z.boolean(),
});

export async function setSessionDone(
  raw: z.infer<typeof inputSchema>,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "La base de données n'est pas configurée." };
  }

  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Séance inconnue." };

  const { sessionId, done } = parsed.data;

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

    // La RLS restreint déjà la mise à jour aux séances de l'utilisateur : une
    // séance d'autrui ne renvoie simplement aucune ligne.
    const { data: updated, error } = await supabase
      .from("study_sessions")
      .update({ status: done ? "fait" : "a_faire" })
      .eq("id", sessionId)
      .select("id")
      .single();

    if (error || !updated) {
      return { ok: false, error: "La séance n'a pas pu être mise à jour." };
    }

    // L'XP passe par la RPC, qui applique le plafond journalier et déduplique :
    // décocher puis recocher la même séance ne recrédite donc rien.
    if (done) {
      await supabase.rpc("award_xp", {
        p_kind: "plan_session_completed",
        p_scope: sessionId,
        p_context: {},
        p_ref_table: "study_sessions",
        p_ref_id: sessionId,
      });
    }

    // Le compteur d'XP du bandeau vit dans la mise en page, pas dans la page.
    revalidatePath("/", "layout");

    return { ok: true };
  } catch {
    return { ok: false, error: "La séance n'a pas pu être mise à jour." };
  }
}
