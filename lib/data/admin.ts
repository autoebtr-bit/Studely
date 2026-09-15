import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { PlanTier } from "@/lib/billing/plans";

/**
 * Chiffres d'administration.
 *
 * Tout passe par des fonctions SQL qui refusent de répondre à qui n'est pas
 * administrateur : le contrôle vit dans la base, pas ici. Ce module ne fait que
 * transmettre — il ne décide de rien, et ne pourrait pas être contourné en
 * modifiant la page.
 */

export interface AdminOverview {
  comptes: number;
  comptesSemaine: number;
  abonnesActifs: number;
  abonnesEnRetard: number;
  essaisEpuises: number;
  khollesMois: number;
  coursImportes: number;
  coutMoisUsd: number;
  coutGratuitMoisUsd: number;
}

export interface AdminSpender {
  email: string;
  plan: PlanTier;
  coutUsd: number;
  appels: number;
}

/** L'utilisateur connecté a-t-il accès à l'administration ? */
export async function readIsAdmin(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("is_admin");
    return !error && data === true;
  } catch {
    // Le défaut prudent est de refuser : une base momentanément illisible ne
    // doit jamais ouvrir un écran d'administration.
    return false;
  }
}

export async function readAdminOverview(): Promise<AdminOverview | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("admin_overview").single();

    if (error || !data) return null;

    return {
      comptes: data.comptes,
      comptesSemaine: data.comptes_semaine,
      abonnesActifs: data.abonnes_actifs,
      abonnesEnRetard: data.abonnes_en_retard,
      essaisEpuises: data.essais_epuises,
      khollesMois: data.kholles_mois,
      coursImportes: data.cours_importes,
      coutMoisUsd: Number(data.cout_mois_usd),
      coutGratuitMoisUsd: Number(data.cout_gratuit_mois_usd),
    };
  } catch {
    return null;
  }
}

export async function readTopSpenders(limit = 10): Promise<AdminSpender[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("admin_top_spenders", {
      p_limit: limit,
    });

    if (error || !data) return [];

    return data.map((row) => ({
      email: row.email,
      plan: row.plan,
      coutUsd: Number(row.cout_usd),
      appels: row.appels,
    }));
  } catch {
    return [];
  }
}
