import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Point de retour d'OAuth et des liens magiques.
 *
 * Supabase renvoie ici avec un `code` à échanger contre une session. L'échange
 * doit avoir lieu côté serveur : c'est lui qui pose les cookies de session.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("suivant") ?? "/dashboard";

  // Redirection ouverte : on n'accepte qu'un chemin interne.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?erreur=configuration`);
  }

  const errorDescription = searchParams.get("error_description");
  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?erreur=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erreur=code_manquant`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?erreur=echange_impossible`);
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
