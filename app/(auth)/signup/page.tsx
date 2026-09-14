import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm, AuthFormFallback } from "../auth-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
        Crée ton compte
      </h1>
      <p className="mt-1.5 text-center text-sm text-slate-600">
        Gratuit, et prêt en une minute.
      </p>

      {/* AuthForm lit les paramètres d'URL : Suspense est requis au prérendu. */}
      <Suspense fallback={<AuthFormFallback />}>
        <AuthForm mode="signup" />
      </Suspense>

      <p className="mt-6 text-center text-sm text-slate-600">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
