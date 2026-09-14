import "server-only";

import { NextResponse } from "next/server";
import type { z } from "zod";
import { KHOLLES_OFFERTES } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { KholleSource } from "@/lib/supabase/types";
import { formatDateLong } from "@/lib/utils/date";
import {
  FREE_TIER_CEILING_USD,
  estimateCostUsd,
  type TokenUsage,
} from "./models";

/**
 * Contrôles obligatoires avant tout appel au modèle.
 *
 * Ordre voulu : authentification → validation de l'entrée → budget de l'essai →
 * quota → appel. Le quota est consommé AVANT l'appel : dans le cas contraire,
 * un utilisateur pourrait déclencher un appel facturé puis se voir refuser, ce
 * qui coûterait sans rien rendre.
 */

/**
 * `kholle` réserve une khôlle blanche entière — sujet, relances et fiche notée
 * comprises. La notation ne consomme rien : couper un élève avant sa fiche lui
 * ferait perdre vingt minutes d'oral pour rien.
 */
export type QuotaKind = "ai_messages" | "ai_generations" | "kholle";

interface GuardSuccess<T> {
  ok: true;
  userId: string;
  body: T;
  supabase: Awaited<ReturnType<typeof createClient>>;
  /**
   * D'où la khôlle a été prélevée, quand il s'agissait d'un quota `kholle`.
   *
   * L'appelant en a besoin pour la rendre si la génération échoue : une khôlle
   * offerte ne se rembourse pas au même endroit qu'une khôlle du plan.
   */
  kholleSource?: KholleSource;
}

interface GuardFailure {
  ok: false;
  response: NextResponse;
}

export type GuardResult<T> = GuardSuccess<T> | GuardFailure;

function fail(status: number, message: string, extra?: object): GuardFailure {
  return {
    ok: false,
    response: NextResponse.json({ error: message, ...extra }, { status }),
  };
}

/* ----------------------------------------- Plafond de dépense de l'essai -- */

/**
 * La dépense se lit en base, mais pas à chaque requête : une somme sur le
 * journal de consommation à chaque appel coûterait plus cher que ce qu'elle
 * protège. Une minute de fraîcheur suffit pour un garde-fou d'accident.
 *
 * La valeur mémorisée est **globale** — la dépense de l'ensemble des comptes
 * gratuits — donc légitimement partagée entre les requêtes. C'est la décision
 * de bloquer qui est propre à l'appelant, et elle n'est pas mise en cache.
 */
const SPEND_CACHE_MS = 60_000;
let spendCache: { value: number; at: number } | null = null;

async function freeTierOverCeiling(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<boolean> {
  const now = Date.now();
  if (spendCache && now - spendCache.at < SPEND_CACHE_MS) {
    return spendCache.value >= FREE_TIER_CEILING_USD;
  }

  const { data, error } = await supabase.rpc("free_tier_spend_this_month");

  // En cas d'échec, on laisse passer : un garde-fou ne doit pas devenir lui-même
  // la cause d'une panne générale.
  if (error || typeof data !== "number") return false;

  spendCache = { value: data, at: now };
  return data >= FREE_TIER_CEILING_USD;
}

/**
 * Faut-il refuser cet appel pour cause de budget d'essai épuisé ?
 *
 * **Un abonné n'est jamais bloqué.** Sa consommation est déjà bornée par son
 * quota mensuel et elle est financée ; le couper reviendrait à punir le client
 * parce que le produit marche.
 *
 * La lecture de l'abonnement ne se produit que sur le chemin rare — plafond
 * déjà franchi — jamais en fonctionnement normal.
 */
async function blockedByFreeTierCeiling(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  if (!(await freeTierOverCeiling(supabase))) return false;

  const { data } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();

  // Sans ligne d'abonnement — le trigger d'inscription la crée, donc cela ne
  // devrait pas arriver — on traite comme gratuit : c'est le défaut le moins
  // coûteux.
  return (data?.plan ?? "gratuit") === "gratuit";
}

/* ------------------------------------------------- Service indisponible -- */

/**
 * Le service d'IA est-il configuré ?
 *
 * Sans `ANTHROPIC_API_KEY`, `anthropic()` lève une exception ordinaire, que
 * `describeAiError` traduit en « une erreur inattendue est survenue » : l'élève
 * croit à une panne, et nous à un bug. Le tester ici distingue « pas encore
 * activé » de « cassé », et surtout **évite de débiter un quota** pour un appel
 * qui ne partira jamais — une khôlle offerte perdue avant même le lancement.
 */
function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/* ------------------------------------------------------------------ Garde -- */

/**
 * @param quotaKind Type de compteur à débiter, ou `null` pour authentifier et
 *   valider sans rien consommer — le cas d'une étape déjà couverte par une
 *   réservation antérieure, comme la notation d'une khôlle en cours.
 */
export async function guardAiRoute<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
  quotaKind: QuotaKind | null,
): Promise<GuardResult<z.infer<T>>> {
  // Sans base configurée, `createClient()` lève et la route répond 500 : une
  // erreur brute, qui ressemble à une panne alors que c'est une installation
  // incomplète. Constaté sur le premier déploiement, dont les variables
  // n'avaient pas encore été renseignées.
  if (!isSupabaseConfigured()) {
    return fail(
      503,
      "Le service n'est pas encore disponible. Reviens dans un moment.",
    );
  }

  const supabase = createClient();

  // 1. Authentification — `getUser()` valide le jeton côté serveur.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return fail(401, "Tu dois être connecté pour utiliser cette fonctionnalité.");
  }

  // 2. Validation de l'entrée.
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail(400, "Corps de requête illisible.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return fail(400, "Requête invalide.", {
      details: parsed.error.flatten().fieldErrors,
    });
  }

  // 3. Service configuré ? Avant le quota : rien ne doit être débité pour un
  //    appel qui ne peut pas partir.
  if (!aiConfigured()) {
    return fail(
      503,
      "Cette fonctionnalité s'active très bientôt. Rien ne t'a été décompté.",
    );
  }

  // 4. Budget de l'essai gratuit, avant tout appel facturé. Sans effet sur un
  //    abonné, dont la consommation est déjà bornée par son quota.
  if (await blockedByFreeTierCeiling(supabase, user.id)) {
    return fail(
      503,
      "L'essai gratuit est momentanément suspendu, le temps que nous " +
        "rouvrions les accès. Reviens un peu plus tard, ou passe au Pro pour " +
        "continuer tout de suite.",
    );
  }

  // 5. Quota, consommé de façon atomique côté base.
  if (quotaKind === null) {
    return { ok: true, userId: user.id, body: parsed.data, supabase };
  }

  if (quotaKind === "kholle") {
    const { data: kholle, error } = await supabase.rpc("consume_kholle").single();

    if (error) {
      return fail(500, "Impossible de vérifier ton solde de khôlles. Réessaie.");
    }

    if (kholle && !kholle.allowed) {
      // Sans allocation récurrente — l'essai gratuit — il n'y a pas de
      // « prochaine fois » : annoncer une date serait un mensonge, et au pire
      // moment possible, celui où l'abonnement se décide.
      return fail(
        429,
        kholle.renews
          ? `Tu as utilisé toutes tes khôlles de la période. ` +
              `La prochaine arrive le ${formatDateLong(kholle.resets_at)}.`
          : `Ton essai gratuit est terminé : tes ${KHOLLES_OFFERTES} khôlles ` +
              `blanches ont été utilisées. Passe au Pro pour continuer.`,
        {
          remaining: 0,
          renews: kholle.renews,
          ...(kholle.renews ? { resetsAt: kholle.resets_at } : {}),
        },
      );
    }

    return {
      ok: true,
      userId: user.id,
      body: parsed.data,
      supabase,
      kholleSource: kholle?.source,
    };
  }

  const { data: quota, error: quotaError } = await supabase
    .rpc("consume_quota", { p_kind: quotaKind, p_amount: 1 })
    .single();

  if (quotaError) {
    return fail(500, "Impossible de vérifier ton quota. Réessaie.");
  }

  if (quota && !quota.allowed) {
    // Une limite à zéro n'est pas un quota atteint : la fonctionnalité n'est
    // pas incluse. Dire « reviens demain » promettrait un retour qui n'arrive
    // jamais.
    return fail(
      429,
      quota.limit_value === 0
        ? "Cette fonctionnalité fait partie de l'offre Pro."
        : `Tu as atteint ta limite quotidienne (${quota.limit_value}). ` +
            "Elle se réinitialise demain, ou passe à Pro pour la lever.",
      { used: quota.used, limit: quota.limit_value },
    );
  }

  return { ok: true, userId: user.id, body: parsed.data, supabase };
}

/**
 * Journalise la consommation réelle après l'appel.
 * Volontairement silencieuse en cas d'échec : un problème de journalisation ne
 * doit jamais faire échouer une réponse déjà produite pour l'élève.
 */
export async function logAiUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    userId: string;
    route: string;
    model: string;
  } & TokenUsage,
): Promise<void> {
  try {
    await supabase.from("ai_usage_log").insert({
      user_id: params.userId,
      route: params.route,
      model: params.model,
      tokens_in: params.tokensIn,
      tokens_out: params.tokensOut,
      cache_read: params.cacheRead ?? 0,
      cost_est_usd: estimateCostUsd(params),
    });
  } catch {
    // Journalisation best-effort.
  }
}
