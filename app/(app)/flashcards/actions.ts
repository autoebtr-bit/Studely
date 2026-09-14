"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { nextDueDate, review, type Sm2Grade } from "@/lib/srs/sm2";

/**
 * Enregistrement d'une révision de fiche.
 *
 * L'état SM-2 vivait en mémoire et disparaissait à la navigation : la
 * répétition espacée ne répétait donc rien, et l'XP affichée n'était jamais
 * créditée. C'est la fonction qui reste utile à un compte dont l'essai est
 * terminé — elle ne coûte aucun appel au modèle — donc celle qu'il est le plus
 * coûteux de laisser fictive.
 *
 * **Le calcul est refait ici, à partir de l'état stocké.** Le client en affiche
 * une prédiction sur les boutons ; il ne l'écrit pas.
 */

const inputSchema = z.object({
  cardId: z.string().uuid(),
  /** Note SM-2, telle que produite par `REVIEW_BUTTONS`. */
  grade: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
});

export async function recordReview(
  raw: z.infer<typeof inputSchema>,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "La base de données n'est pas configurée." };
  }

  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Révision invalide." };

  const { cardId, grade } = parsed.data;

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

    // La RLS filtre sur le propriétaire : pas de ligne = carte inconnue ou
    // appartenant à quelqu'un d'autre, et la distinction ne nous regarde pas.
    const { data: state } = await supabase
      .from("flashcard_states")
      .select("ease, interval_days, reps, lapses")
      .eq("card_id", cardId)
      .maybeSingle();

    if (!state) return { ok: false, error: "Carte introuvable." };

    const next = review(
      {
        ease: state.ease,
        intervalDays: state.interval_days,
        reps: state.reps,
        lapses: state.lapses,
      },
      grade as Sm2Grade,
    );

    const now = new Date();

    const { error } = await supabase
      .from("flashcard_states")
      .update({
        ease: next.ease,
        interval_days: next.intervalDays,
        reps: next.reps,
        lapses: next.lapses,
        last_review_at: now.toISOString(),
        due_at: nextDueDate(next, now).toISOString(),
      })
      .eq("card_id", cardId);

    if (error) {
      return { ok: false, error: "La révision n'a pas pu être enregistrée." };
    }

    // `p_scope` porte la carte et le jour : réviser la même carte deux fois
    // dans la journée ne crédite qu'une fois, et la RPC applique en plus son
    // plafond journalier.
    await supabase.rpc("award_xp", {
      p_kind: "flashcard_review",
      p_scope: `${cardId}:${now.toISOString().slice(0, 10)}`,
      p_context: {},
      p_ref_table: "flashcards",
      p_ref_id: cardId,
    });

    return { ok: true };
  } catch {
    return { ok: false, error: "La révision n'a pas pu être enregistrée." };
  }
}

/**
 * Clôture d'une session de révision.
 *
 * Séparée de la révision carte par carte : le bonus de fin ne se gagne qu'une
 * fois, à la dernière carte, et non à chaque réponse.
 */
export async function completeReviewSession(
  chapterId: string,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured()) return { ok: false };

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };

    await supabase.rpc("award_xp", {
      p_kind: "flashcard_session_completed",
      // Une session par chapitre et par jour : enchaîner cinq sessions sur le
      // même chapitre ne multiplie pas le bonus.
      p_scope: `${chapterId}:${new Date().toISOString().slice(0, 10)}`,
      p_context: {},
    });

    // Le bandeau affiche l'XP et le niveau : sans cela ils resteraient à leur
    // valeur d'avant la session.
    revalidatePath("/", "layout");

    return { ok: true };
  } catch {
    return { ok: false };
  }
}
