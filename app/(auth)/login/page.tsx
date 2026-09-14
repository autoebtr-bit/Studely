import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm, AuthFormFallback } from "../auth-form";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
        Content de te revoir
      </h1>
      <p className="mt-1.5 text-center text-sm text-slate-600">
        Connecte-toi pour reprendre tes révisions.
      </p>

      {/* AuthForm lit les paramètres d'URL : Suspense est requis au prérendu. */}
      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm mode="login" />
      </Suspense>

      <p className="mt-6 text-center text-sm text-slate-600">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-brand-600 hover:underline">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
