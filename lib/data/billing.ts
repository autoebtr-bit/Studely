import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isStripeConfigured } from "@/lib/billing/stripe";
import type { PlanTier } from "@/lib/billing/plans";

/**
 * L'abonnement de l'élève connecté, et le solde de khôlles qui va avec.
 *
 * Comme les autres lectures de `lib/data/`, ne lève jamais : un abonnement
 * illisible doit dégrader vers l'essai gratuit, pas casser l'écran. Se tromper
 * dans ce sens coûte quelques khôlles ; se tromper dans l'autre ouvrirait le
 * payant à tout le monde dès le premier incident de base.
 */

export interface AppSubscription {
  plan: PlanTier;
  status: "actif" | "essai" | "en_retard" | "annule";
  /** Fin de la période payée, pour annoncer la prochaine échéance. */
  currentPeriodEnd: string | null;
  /** L'abonnement est résilié mais court jusqu'à la fin de la période. */
  cancelAtPeriodEnd: boolean;
  /** Un client Stripe existe : l'espace de gestion est ouvrable. */
  hasStripeCustomer: boolean;
  /** Khôlles restantes, tous compteurs confondus. */
  kholleCredits: number;
  /**
   * Le paiement est-il ouvert ?
   *
   * Lu côté serveur puis transmis : `isStripeConfigured` dépend de variables
   * serveur, et un bouton d'abonnement qui mène à une erreur vaut moins qu'une
   * mention honnête « bientôt disponible ».
   */
  billingOpen: boolean;
}

const ESSAI: Omit<AppSubscription, "kholleCredits" | "billingOpen"> = {
  plan: "gratuit",
  status: "essai",
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  hasStripeCustomer: false,
};

export async function readSubscription(): Promise<AppSubscription> {
  const billingOpen = isStripeConfigured();

  if (!isSupabaseConfigured()) {
    return { ...ESSAI, kholleCredits: 0, billingOpen };
  }

  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ...ESSAI, kholleCredits: 0, billingOpen };

    const [{ data: subscription }, { data: credits }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select(
          "plan, status, current_period_end, cancel_at_period_end, stripe_customer_id",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("kholle_credits")
        .select("remaining")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    return {
      plan: subscription?.plan ?? "gratuit",
      status: subscription?.status ?? "essai",
      currentPeriodEnd: subscription?.current_period_end ?? null,
      cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
      hasStripeCustomer: Boolean(subscription?.stripe_customer_id),
      kholleCredits: credits?.remaining ?? 0,
      billingOpen,
    };
  } catch {
    return { ...ESSAI, kholleCredits: 0, billingOpen };
  }
}
