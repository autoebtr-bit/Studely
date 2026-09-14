import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

/**
 * Client Supabase pour Server Components, Server Actions et Route Handlers.
 *
 * À créer par requête — ne jamais le mettre en variable de module : le client
 * porte les cookies de session de l'utilisateur courant, et un partage entre
 * requêtes ferait fuiter la session d'un utilisateur vers un autre.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Appelé depuis un Server Component : l'écriture de cookies y est
            // interdite. Le middleware rafraîchit déjà la session, on ignore.
          }
        },
      },
    },
  );
}

/**
 * Client à privilèges élevés, qui contourne la RLS.
 *
 * Réservé aux traitements sans utilisateur : webhook Stripe, alimentation du
 * catalogue d'annales, tâches d'administration. Ne jamais l'utiliser dans un
 * chemin de requête déclenché par un utilisateur sans vérification explicite
 * de ses droits — il n'y a plus aucun filet.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : le client d'administration ne peut pas être créé.",
    );
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // Sans session : ce client ne doit jamais écrire de cookie.
        },
      },
    },
  );
}
