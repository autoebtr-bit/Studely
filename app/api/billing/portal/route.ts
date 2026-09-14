import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isStripeConfigured, siteUrl, stripe } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Espace de gestion de l'abonnement, hébergé par Stripe.
 *
 * Résilier, changer de carte, télécharger ses factures : tout s'y fait. C'est
 * une obligation autant qu'un confort — un abonnement doit pouvoir être résilié
 * aussi simplement qu'il a été souscrit, et réimplémenter ces écrans nous-mêmes
 * n'apporterait qu'un risque de plus sur des données de facturation.
 */
export async function POST() {
  if (!isSupabaseConfigured() || !isStripeConfigured()) {
    return Response.json(
      { error: "La gestion de l'abonnement n'est pas encore disponible." },
      { status: 503 },
    );
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Tu dois être connecté." }, { status: 401 });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return Response.json(
      { error: "Aucun abonnement à gérer pour ce compte." },
      { status: 404 },
    );
  }

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl()}/parametres`,
    });

    return Response.json({ url: session.url });
  } catch {
    return Response.json(
      { error: "L'espace de gestion est momentanément indisponible." },
      { status: 502 },
    );
  }
}
