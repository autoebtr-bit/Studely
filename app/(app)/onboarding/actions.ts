"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Enregistrement du questionnaire d'accueil.
 *
 * Server Action plutôt qu'une route : c'est un formulaire, pas une API, et la
 * session arrive avec la requête sans avoir à la repasser.
 *
 * Trois écritures, dans cet ordre — le profil d'abord, car les matières y font
 * référence par clé étrangère.
 */

const inputSchema = z.object({
  level: z.string().min(1).max(60),
  subjects: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        emoji: z.string().max(8),
      }),
    )
    .min(1)
    .max(20),
  /** Date ISO courte. Le champ du formulaire la borne déjà, on revalide ici. */
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type OnboardingInput = z.infer<typeof inputSchema>;

/**
 * Couleurs de matière, prises à la palette de marque.
 *
 * Attribuées par position plutôt qu'au hasard : deux comptes qui choisissent
 * les mêmes matières obtiennent les mêmes couleurs, et l'écran ne change pas
 * d'aspect d'un rechargement à l'autre.
 */
const SUBJECT_COLORS = [
  "#6D3BEA",
  "#FF5733",
  "#E83E8C",
  "#0EA5A4",
  "#F59E0B",
  "#2563EB",
] as const;

export async function completeOnboarding(
  raw: OnboardingInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "La base de données n'est pas configurée." };
  }

  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Réponses incomplètes. Reprends le questionnaire." };
  }
  const { level, subjects, examDate } = parsed.data;

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        study_level: level,
        exam_date: examDate,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      return { ok: false, error: "Ton profil n'a pas pu être enregistré." };
    }

    // Un élève qui repasse le questionnaire ne doit pas se retrouver avec ses
    // matières en double.
    const { data: existing } = await supabase.from("subjects").select("name");
    const known = new Set((existing ?? []).map((s) => s.name));

    const toCreate = subjects
      .filter((s) => !known.has(s.name))
      .map((s, i) => ({
        user_id: user.id,
        name: s.name,
        emoji: s.emoji,
        color: SUBJECT_COLORS[(known.size + i) % SUBJECT_COLORS.length]!,
        position: known.size + i,
      }));

    if (toCreate.length > 0) {
      const { error: subjectsError } = await supabase
        .from("subjects")
        .insert(toCreate);

      // Le profil est déjà écrit : on ne fait pas échouer tout le parcours pour
      // des matières, que l'élève pourra ajouter depuis ses cours.
      if (subjectsError) {
        return {
          ok: true,
          error: "Tes matières n'ont pas pu être créées. Ajoute-les depuis Mes cours.",
        };
      }
    }

    // L'XP passe par la RPC, jamais par le client. `p_scope` est fixe : repasser
    // le questionnaire ne crédite pas deux fois.
    await supabase.rpc("award_xp", {
      p_kind: "onboarding_completed",
      p_scope: "onboarding",
    });

    // Le shell affiche le nom et l'XP : sans ça, le tableau de bord montrerait
    // encore les valeurs d'avant le questionnaire.
    revalidatePath("/", "layout");

    return { ok: true };
  } catch {
    return { ok: false, error: "L'enregistrement a échoué. Réessaie." };
  }
}
