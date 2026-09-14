"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { SUPABASE_SETUP_HINT, isSupabaseConfigured } from "@/lib/supabase/config";

type Mode = "login" | "signup";

/**
 * Formulaire de connexion et d'inscription.
 *
 * Trois voies : mot de passe, lien magique, et Google. La session est posée en
 * cookie par le client navigateur de `@supabase/ssr` ; le middleware la
 * rafraîchit ensuite à chaque requête.
 */
export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const configured = isSupabaseConfigured();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Destination mémorisée par le middleware avant la redirection vers /login.
  const next = searchParams.get("suivant") ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) return;

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback?suivant=/onboarding`,
          },
        });
        if (signUpError) throw signUpError;

        setNotice(
          "Compte créé. Si une confirmation par e-mail est demandée, vérifie ta boîte de réception.",
        );
        router.push("/onboarding");
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!configured || !email) {
      setError("Renseigne d'abord ton adresse e-mail.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      const { error: linkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?suivant=${encodeURIComponent(next)}`,
        },
      });
      if (linkError) throw linkError;
      setNotice(`Lien de connexion envoyé à ${email}. Vérifie ta boîte mail.`);
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!configured) return;
    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?suivant=${encodeURIComponent(next)}`,
        },
      });
      if (oauthError) throw oauthError;
      // La redirection est prise en charge par Supabase.
    } catch (err) {
      setError(translateAuthError(err));
      setBusy(false);
    }
  }

  return (
    <Card className="mt-7 p-6">
      {!configured && (
        <div className="mb-5 flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{SUPABASE_SETUP_HINT}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {mode === "signup" && (
          <Field
            id="fullName"
            label="Prénom et nom"
            type="text"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
            required
          />
        )}

        <Field
          id="email"
          label="Adresse e-mail"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />

        <Field
          id="password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
          hint={mode === "signup" ? "8 caractères minimum." : undefined}
        />

        {error && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        {notice && (
          <p className="rounded-card bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={busy || !configured}>
          {busy && <Loader2 className="animate-spin" />}
          {mode === "signup" ? "Créer mon compte" : "Se connecter"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-cream-200" />
        <span className="text-xs text-slate-400">ou</span>
        <span className="h-px flex-1 bg-cream-200" />
      </div>

      <div className="space-y-2.5">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          disabled={busy || !configured}
        >
          <GoogleMark />
          Continuer avec Google
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          onClick={handleMagicLink}
          disabled={busy || !configured}
        >
          <Mail />
          Recevoir un lien de connexion
        </Button>
      </div>
    </Card>
  );
}

/** Squelette affiché pendant l'hydratation, aux dimensions du vrai formulaire. */
export function AuthFormFallback() {
  return (
    <Card className="mt-7 p-6" aria-hidden>
      <div className="space-y-3.5">
        <Skeleton className="h-[70px] w-full" />
        <Skeleton className="h-[70px] w-full" />
        <Skeleton className="h-11 w-full rounded-pill" />
      </div>
      <div className="my-5 h-px bg-cream-200" />
      <div className="space-y-2.5">
        <Skeleton className="h-11 w-full rounded-pill" />
        <Skeleton className="h-11 w-full rounded-pill" />
      </div>
    </Card>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  hint,
  ...rest
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  // `value` et `onChange` sont pilotés ci-dessus : on les retire des attributs
  // natifs pour éviter deux signatures concurrentes sur la même propriété.
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-900">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-11 w-full rounded-card border border-cream-300 px-3.5 text-sm outline-none transition-colors focus:border-brand-400"
        {...rest}
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.64 6.16-4.64Z"
      />
    </svg>
  );
}

/** Traduit les messages d'erreur Supabase, qui sont en anglais. */
function translateAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (/invalid login credentials/i.test(message)) {
    return "Adresse e-mail ou mot de passe incorrect.";
  }
  if (/user already registered/i.test(message)) {
    return "Un compte existe déjà avec cette adresse. Connecte-toi plutôt.";
  }
  if (/password should be at least/i.test(message)) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  if (/email not confirmed/i.test(message)) {
    return "Ton adresse n'est pas encore confirmée. Vérifie ta boîte mail.";
  }
  // Supabase plafonne les envois d'e-mails à quelques-uns par heure sur son
  // service intégré. Annoncer « une minute » envoyait l'élève réessayer en
  // boucle pour rien.
  if (/rate limit|too many/i.test(message)) {
    return (
      "Trop de tentatives d'envoi. Le service de messagerie limite à quelques " +
      "e-mails par heure : réessaie plus tard, et vérifie tes spams entre-temps."
    );
  }
  if (/provider is not enabled/i.test(message)) {
    return "Cette méthode de connexion n'est pas activée sur le projet Supabase.";
  }
  return "La connexion a échoué. Réessaie dans un instant.";
}
