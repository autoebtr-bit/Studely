import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";
import { isSupabaseConfigured } from "./config";

/** Préfixes accessibles sans être connecté. */
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/tarifs",
  "/mentions-legales",
  "/confidentialite",
  "/cgv",

  /**
   * Le webhook de paiement n'a, par construction, aucune session : il est
   * appelé par les serveurs de Stripe, pas par un navigateur. Le protéger par
   * l'authentification le bloquerait entièrement, et les abonnements payés ne
   * seraient jamais enregistrés.
   *
   * Il n'est pas ouvert pour autant : il refuse toute requête dont la
   * signature ne correspond pas au secret partagé avec Stripe, ce qui est un
   * contrôle plus fort qu'une session.
   */
  "/api/billing/webhook",

  /**
   * Diagnostic de configuration. Accessible sans session, volontairement :
   * exiger une connexion pour diagnostiquer une panne d'authentification
   * serait circulaire — c'est précisément quand rien ne marche qu'on en a
   * besoin. Elle ne renvoie que des booléens, jamais une valeur.
   */
  "/api/health",
];

/** Chemins réservés aux visiteurs : un utilisateur connecté est redirigé. */
const GUEST_ONLY = ["/login", "/signup"];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Rafraîchit la session à chaque requête et arbitre l'accès aux routes.
 *
 * Le rafraîchissement doit avoir lieu ici : un Server Component ne peut pas
 * écrire de cookie, donc sans ce passage la session expirerait silencieusement.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Mode démonstration : sans projet Supabase, on laisse passer tout le monde
  // plutôt que de rendre l'application inaccessible. Dès que les variables
  // d'environnement sont renseignées, la protection s'active d'elle-même.
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // `getUser()` et non `getSession()` : seul `getUser()` valide le jeton auprès
  // du serveur d'authentification. `getSession()` fait confiance au cookie, qui
  // peut être forgé.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    // Une route d'API doit répondre, pas rediriger. `fetch` suit les
    // redirections en silence : le client recevrait la page de connexion en
    // HTML avec un statut 200, et le flux du chat la déverserait telle quelle
    // dans la bulle de réponse. Un 401 en JSON est la seule réponse qu'un
    // appelant puisse interpréter.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Ta session a expiré. Reconnecte-toi pour continuer." },
        { status: 401 },
      );
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Mémorise la destination pour y revenir après connexion.
    url.searchParams.set("suivant", pathname);
    return NextResponse.redirect(url);
  }

  if (user && GUEST_ONLY.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
