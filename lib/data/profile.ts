import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * L'élève connecté, tel que les écrans l'affichent.
 *
 * Reprend volontairement la forme de l'ancien `MOCK_USER` : les données de
 * démonstration avaient été écrites au format du schéma cible, ce qui permet de
 * basculer les écrans sans les réécrire.
 */
export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  studyLevel: string | null;
  examDate: string | null;
  xpTotal: number;
  streakCurrent: number;
  streakBest: number;
  /** Date d'inscription — sert à distinguer un compte neuf. */
  createdAt: string;
  /**
   * Accès au tableau de bord d'administration.
   *
   * Lu ici parce que c'est une colonne de `profiles` : l'inclure dans une
   * requête qui a lieu de toute façon ne coûte rien, là où une RPC dédiée
   * ajouterait un aller-retour à **chaque** page, pour tout le monde.
   *
   * Sert uniquement à afficher ou masquer un lien. L'autorisation réelle est
   * rendue par les fonctions SQL du tableau de bord, qui refusent de répondre
   * indépendamment de ce que prétend l'interface.
   */
  isAdmin: boolean;
}

/**
 * Profil de l'élève connecté, ou `null` s'il n'y a pas de session.
 *
 * En pratique le middleware interdit d'atteindre l'application sans session ;
 * le `null` couvre le cas où la base n'est pas configurée et le temps très
 * court entre l'expiration d'un jeton et la redirection.
 */
export async function readProfile(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, avatar_url, study_level, exam_date, xp_total, level, streak_current, streak_best, created_at, is_admin",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      // Le déclencheur d'inscription reprend le nom saisi, ou à défaut la
      // partie gauche de l'adresse. Un profil sans nom reste possible via
      // certains fournisseurs : on ne veut pas afficher « null » dans la barre.
      fullName: data.full_name?.trim() || user.email?.split("@")[0] || "Toi",
      email: user.email ?? "",
      avatarUrl: data.avatar_url,
      studyLevel: data.study_level,
      examDate: data.exam_date,
      xpTotal: data.xp_total,
      streakCurrent: data.streak_current,
      streakBest: data.streak_best,
      createdAt: data.created_at,
      isAdmin: data.is_admin === true,
    };
  } catch {
    // Un profil illisible ne doit pas empêcher d'afficher l'application.
    return null;
  }
}
