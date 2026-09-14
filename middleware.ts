import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Applique le middleware à tout sauf :
     *  - les fichiers internes de Next (_next/static, _next/image)
     *  - le favicon et les fichiers statiques usuels
     *
     * Les routes d'API restent couvertes : elles ont aussi besoin de la session.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
