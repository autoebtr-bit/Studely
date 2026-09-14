import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import {
  grantsPro,
  isStripeConfigured,
  mapStatus,
  stripe,
} from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Réception des événements Stripe.
 *
 * **C'est le seul endroit qui accorde l'accès payant.** Ni la page de règlement
 * ni le retour navigateur ne font foi : l'un comme l'autre se déclenchent sur
 * une simple intention, et l'URL de retour est devinable. Seul un événement
 * signé par Stripe prouve qu'un paiement a eu lieu.
 *
 * Deux conséquences de conception :
 *
 * 1. **La signature est vérifiée sur le corps brut.** Reparser puis
 *    resérialiser le JSON modifie les espaces et invalide la signature : le
 *    corps se lit donc en texte, avant tout.
 * 2. **On écrit avec la clé de service.** Aucun utilisateur n'est connecté ici,
 *    donc aucune session sur laquelle la RLS pourrait s'appuyer. C'est
 *    précisément l'usage pour lequel cette clé existe — et le seul.
 */

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return Response.json({ error: "Stripe non configuré." }, { status: 503 });
  }

  // Clé distincte de celles de Stripe, et indispensable ici : sans elle,
  // `createServiceClient()` lève, la route répond 500, et Stripe réessaie en
  // boucle un événement qui ne pourra jamais aboutir. Mieux vaut refuser tout
  // de suite avec un message qui dit quoi corriger.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY manquante : l'abonnement ne peut pas être enregistré." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Signature absente." }, { status: 400 });
  }

  // Le corps brut, avant toute interprétation.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch {
    // Signature invalide : la requête ne vient pas de Stripe. Ne rien faire, et
    // ne rien dire de plus.
    return Response.json({ error: "Signature invalide." }, { status: 400 });
  }

  try {
    // Un `switch` sur le type plutôt qu'un test d'appartenance : c'est lui qui
    // permet à TypeScript de rattacher la charge utile au bon type d'objet.
    // Tout événement non listé est acquitté sans rien faire — un 4xx ferait
    // réessayer Stripe indéfiniment pour quelque chose qui ne nous concerne pas.
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await onSubscriptionChanged(event.data.object, event.type);
        break;

      default:
        break;
    }
  } catch {
    // 500 : Stripe réessaiera. Perdre un paiement déjà encaissé parce que notre
    // base était momentanément indisponible serait le pire résultat possible.
    return Response.json({ error: "Traitement différé." }, { status: 500 });
  }

  return Response.json({ received: true });
}

/* ------------------------------------------------------------ Handlers -- */

/**
 * Premier règlement abouti.
 *
 * L'abonnement complet est relu depuis l'API plutôt que déduit de la session :
 * la session ne porte pas l'état de l'abonnement, et c'est lui qui décide de
 * l'accès.
 */
async function onCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode !== "subscription") return;

  const subscriptionId = idOf(session.subscription);
  if (!subscriptionId) return;

  const subscription = await stripe().subscriptions.retrieve(subscriptionId);

  const userId =
    session.client_reference_id ??
    subscription.metadata?.user_id ??
    session.metadata?.user_id ??
    null;

  await applySubscription(subscription, userId);
}

async function onSubscriptionChanged(
  subscription: Stripe.Subscription,
  type: Stripe.Event.Type,
): Promise<void> {
  // Une suppression retire l'accès quel que soit le statut transmis.
  const cancelled = type === "customer.subscription.deleted";
  await applySubscription(subscription, subscription.metadata?.user_id ?? null, cancelled);
}

/* -------------------------------------------------------------- Écriture -- */

/**
 * Écrit l'état de l'abonnement pour l'élève concerné.
 *
 * Le plan retombe sur `gratuit` dès que le statut ne donne plus droit au Pro :
 * les quotas se lisent depuis `subscriptions.plan`, donc c'est cette seule
 * colonne qui ouvre ou ferme les fonctions payantes.
 */
async function applySubscription(
  subscription: Stripe.Subscription,
  metadataUserId: string | null,
  forceCancelled = false,
): Promise<void> {
  const admin = createServiceClient();
  const customerId = idOf(subscription.customer);

  // À défaut de métadonnée — un abonnement créé à la main dans le tableau de
  // bord, par exemple — on retrouve l'élève par son identifiant client.
  let userId = metadataUserId;
  if (!userId && customerId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }

  // Sans élève identifiable, il n'y a rien à écrire. On acquitte quand même :
  // faire réessayer Stripe ne ferait pas apparaître l'information manquante.
  if (!userId) return;

  const status = forceCancelled ? "annule" : mapStatus(subscription.status);
  const pro = grantsPro(status);

  await admin
    .from("subscriptions")
    .update({
      plan: pro ? "pro" : "gratuit",
      status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      current_period_end: periodEnd(subscription),
      cancel_at_period_end: subscription.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

/* --------------------------------------------------------------- Outils -- */

/** Un champ Stripe extensible est soit un identifiant, soit l'objet complet. */
function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

/**
 * Fin de la période en cours, en ISO.
 *
 * Stripe a déplacé `current_period_end` de l'abonnement vers ses lignes. Les
 * deux emplacements sont lus : selon la version d'API du compte, l'un ou
 * l'autre est renseigné, et une date manquante ferait croire à un abonnement
 * sans échéance.
 */
function periodEnd(subscription: Stripe.Subscription): string | null {
  const fromItem = subscription.items?.data?.[0]?.current_period_end;
  const fromRoot = (subscription as unknown as { current_period_end?: number })
    .current_period_end;

  const seconds = fromItem ?? fromRoot;
  return typeof seconds === "number"
    ? new Date(seconds * 1000).toISOString()
    : null;
}
