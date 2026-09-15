import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isStripeConfigured } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * État de la configuration du déploiement.
 *
 * Écrit après une séance entière passée à deviner pourquoi un site déployé
 * restait en mode démonstration : les variables étaient bien renseignées dans
 * le tableau de bord de l'hébergeur, mais n'atteignaient pas la construction.
 * De l'extérieur, rien ne permettait de distinguer « variable absente » de
 * « variable présente mais mal formée » — on ne voyait que le symptôme.
 *
 * **Ne renvoie aucune valeur, jamais.** Uniquement des booléens et des
 * longueurs : de quoi répondre à « est-ce renseigné, et est-ce plausible »
 * sans qu'une clé puisse fuir par ici. Une longueur ne permet pas de
 * reconstituer une clé, mais elle distingue immédiatement une valeur vide
 * d'une valeur tronquée au copier-coller.
 *
 * Reste publique volontairement : elle ne dit rien qu'un appel à n'importe
 * quelle route ne révèle déjà par son code d'erreur, et exiger une session
 * pour diagnostiquer une panne d'authentification serait circulaire.
 */

/** Décrit une variable sans jamais exposer son contenu. */
function describe(value: string | undefined) {
  const v = value?.trim() ?? "";
  return { present: v.length > 0, length: v.length };
}

/**
 * Une fonction SQL est-elle présente en base ?
 *
 * On l'appelle sans session et on lit le code d'erreur de Postgres, plutôt que
 * d'interroger un catalogue — ce qui demanderait des droits qu'on n'a pas.
 *
 * - `42883` : la fonction **n'existe pas**. La migration n'est pas passée.
 * - `42501` : elle existe, et l'exécution est **refusée au rôle anonyme**.
 *   C'est le résultat attendu, et il prouve deux choses d'un coup : la
 *   migration est appliquée, et le verrou d'accès est en place.
 *
 * Rien n'est exécuté au passage : le refus tombe avant le corps de la
 * fonction. Sonder `delete_own_account` de cette façon n'efface rien.
 */
async function rpcExiste(
  supabase: ReturnType<typeof createClient>,
  nom: "refund_kholle" | "delete_own_account",
  args: Record<string, unknown>,
): Promise<"appliquee" | "absente" | "indetermine"> {
  try {
    const { error } = await supabase.rpc(
      nom as never,
      args as never,
    );

    // Pas d'erreur du tout : la fonction existe et a accepté l'appel.
    if (!error) return "appliquee";

    if (error.code === "42883") return "absente";
    if (error.code === "42501" || error.code === "28000") return "appliquee";

    return "indetermine";
  } catch {
    return "indetermine";
  }
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

  // Les migrations ne se sondent que si la base répond ; sans configuration,
  // la question n'a pas de sens.
  let migrations: Record<string, string> = {
    _: "base non configurée, rien à vérifier",
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const [refund, suppression] = await Promise.all([
        rpcExiste(supabase, "refund_kholle", { p_source: "offerte" }),
        rpcExiste(supabase, "delete_own_account", {}),
      ]);
      migrations = {
        "0011_kholle_refund": refund,
        "0012_delete_account": suppression,
      };
    } catch {
      migrations = { _: "vérification impossible" };
    }
  }

  return Response.json({
    migrations,
    supabase: {
      url: {
        ...describe(process.env.NEXT_PUBLIC_SUPABASE_URL),
        // La cause la plus fréquente : une adresse collée sans son préfixe.
        // `isSupabaseConfigured` l'exige, et tout bascule en mode
        // démonstration sans le moindre message.
        commencePar_https: url.startsWith("https://"),
        finitPar_supabase_co: url.endsWith(".supabase.co"),
      },
      anonKey: describe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRoleKey: describe(process.env.SUPABASE_SERVICE_ROLE_KEY),
      /** Le verdict : c'est lui qui décide du mode démonstration. */
      configure: isSupabaseConfigured(),
    },
    ia: {
      anthropicKey: describe(process.env.ANTHROPIC_API_KEY),
      plafondEssaiUsd: process.env.AI_FREE_TIER_CEILING_USD ?? "(défaut : 500)",
    },
    stripe: {
      secretKey: describe(process.env.STRIPE_SECRET_KEY),
      webhookSecret: describe(process.env.STRIPE_WEBHOOK_SECRET),
      priceId: describe(process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY),
      configure: isStripeConfigured(),
    },
  });
}
