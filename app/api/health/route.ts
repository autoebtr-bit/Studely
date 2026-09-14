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

export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";

  return Response.json({
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
