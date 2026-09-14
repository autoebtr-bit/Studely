import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  isStripeConfigured,
  proPriceId,
  siteUrl,
  stripe,
} from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ouverture d'une session de règlement pour l'abonnement Pro.
 *
 * Aucune donnée bancaire ne passe par nos serveurs : Stripe héberge la page de
 * paiement, nous ne manipulons qu'une URL de redirection.
 *
 * **Rien n'est écrit en base ici.** L'abonnement n'existe qu'une fois payé, et
 * c'est le webhook qui l'enregistre. Créditer l'accès dès l'ouverture de la
 * page de règlement offrirait le Pro à quiconque clique puis abandonne.
 */
export async function POST() {
  if (!isSupabaseConfigured() || !isStripeConfigured()) {
    return Response.json(
      { error: "L'abonnement n'est pas encore ouvert. Reviens très bientôt." },
      { status: 503 },
    );
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json(
      { error: "Tu dois être connecté pour t'abonner." },
      { status: 401 },
    );
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, status, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Laisser un abonné rouvrir une session de règlement créerait un second
  // abonnement facturé en parallèle. C'est l'espace de gestion qu'il lui faut.
  if (subscription?.plan === "pro" && subscription.status !== "annule") {
    return Response.json(
      { error: "Tu es déjà abonné. Gère ton abonnement depuis tes paramètres." },
      { status: 409 },
    );
  }

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: proPriceId(), quantity: 1 }],

      // Réutiliser le client existant évite les doublons dans Stripe pour
      // quelqu'un qui se désabonne puis revient.
      ...(subscription?.stripe_customer_id
        ? { customer: subscription.stripe_customer_id }
        : { customer_email: user.email }),

      // Deux voies pour retrouver l'élève dans le webhook : `client_reference_id`
      // arrive sur la session, les métadonnées suivent l'abonnement dans le
      // temps. Les événements de renouvellement ne portent que la seconde.
      client_reference_id: user.id,
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },

      success_url: `${siteUrl()}/parametres?abonnement=ok`,
      cancel_url: `${siteUrl()}/parametres?abonnement=annule`,

      /**
       * Calcul automatique de la TVA — désactivé, volontairement.
       *
       * Il exige d'activer Stripe Tax et d'y déclarer ses obligations fiscales.
       * Non configuré, il fait **échouer l'ouverture de la page de paiement** :
       * un réglage de prudence qui empêche d'encaisser est exactement
       * l'inverse de ce qu'on cherche.
       *
       * Un éditeur en franchise en base de TVA qui vend à des étudiants
       * français ne facture aucune TVA : le prix affiché est le prix payé, et
       * ce service — facturé 0,5 % par transaction — n'apporterait rien.
       *
       * À rebasculer sur `true` le jour où la franchise est dépassée, ou dès
       * que les ventes hors de France dépassent le seuil européen : la TVA
       * devient alors celle du pays de l'acheteur, et elle ne se calcule plus
       * à la main.
       */
      automatic_tax: { enabled: false },

      billing_address_collection: "auto",
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return Response.json(
        { error: "La page de paiement n'a pas pu être ouverte. Réessaie." },
        { status: 502 },
      );
    }

    return Response.json({ url: session.url });
  } catch {
    // Le détail Stripe n'apporte rien à un élève et peut divulguer la
    // configuration du compte.
    return Response.json(
      { error: "Le paiement est momentanément indisponible. Réessaie plus tard." },
      { status: 502 },
    );
  }
}
