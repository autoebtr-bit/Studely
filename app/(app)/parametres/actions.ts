"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Le compte : le modifier, ou l'effacer.
 *
 * Les deux boutons existaient depuis le début sans aucun gestionnaire. Celui de
 * suppression était le plus gênant : la politique de confidentialité promet
 * noir sur blanc que l'élève peut effacer son compte et ses données. Une
 * promesse écrite dans un document opposable, et pas tenue.
 */

/* ------------------------------------------------------------- Profil -- */

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(80),
  studyLevel: z.string().trim().max(60),
  /** Date ISO courte, ou chaîne vide pour retirer la date. */
  examDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export async function updateProfile(
  raw: ProfileInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "La base de données n'est pas configurée." };
  }

  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Vérifie les informations saisies." };
  }
  const { fullName, studyLevel, examDate } = parsed.data;

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        // Une chaîne vide n'est pas une valeur : on efface plutôt que d'écrire
        // du vide, sinon l'écran afficherait un niveau nommé « ».
        study_level: studyLevel || null,
        exam_date: examDate || null,
      })
      .eq("id", user.id);

    if (error) {
      return { ok: false, error: "Ton profil n'a pas pu être enregistré." };
    }

    // Le nom apparaît dans la barre latérale, qui vit dans la mise en page.
    revalidatePath("/", "layout");

    return { ok: true };
  } catch {
    return { ok: false, error: "Ton profil n'a pas pu être enregistré." };
  }
}

/* -------------------------------------------------------- Suppression -- */

export async function deleteAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "La base de données n'est pas configurée." };
  }

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Session expirée. Reconnecte-toi." };

    // La RPC est `security definer` : effacer une ligne de `auth.users` dépasse
    // les droits de la clé publique. Elle n'efface que l'appelant, jamais
    // quelqu'un d'autre — l'identité vient de `auth.uid()`, pas d'un paramètre.
    const { error } = await supabase.rpc("delete_own_account");

    if (error) {
      return {
        ok: false,
        error:
          "Ton compte n'a pas pu être supprimé. Écris-nous, nous le ferons manuellement.",
      };
    }

    // Les cookies de session pointent maintenant sur un compte inexistant :
    // sans cette déconnexion, l'élève resterait sur des écrans cassés.
    await supabase.auth.signOut();

    return { ok: true };
  } catch {
    return {
      ok: false,
      error:
        "Ton compte n'a pas pu être supprimé. Écris-nous, nous le ferons manuellement.",
    };
  }
}
