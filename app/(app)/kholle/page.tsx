import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { KholleWorkspace, type KholleBalance } from "./kholle-workspace";

export const metadata: Metadata = { title: "Khôlle blanche" };

/**
 * Solde de khôlles, lu côté serveur.
 *
 * Renvoie `null` tant qu'il n'y a pas de session — c'est le cas aujourd'hui,
 * la base n'étant pas branchée. L'écran n'affiche alors aucun solde plutôt
 * qu'un chiffre inventé.
 */
async function loadBalance(): Promise<KholleBalance | null> {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.rpc("kholle_balance").single();
    if (error || !data) return null;

    return {
      credits: data.credits,
      remaining: data.remaining,
      resetsAt: data.resets_at,
      renews: data.renews,
    };
  } catch {
    // Sans configuration Supabase, la page doit rester consultable.
    return null;
  }
}

export default async function KhollePage() {
  const balance = await loadBalance();

  return (
    <div className="mx-auto max-w-2xl">
      <KholleWorkspace balance={balance} />
    </div>
  );
}
