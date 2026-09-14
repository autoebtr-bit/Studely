"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { postAi } from "@/lib/api/ai";

interface PlanGeneratorProps {
  /** Date du concours, ou `null` si l'élève ne l'a pas encore renseignée. */
  examDate: string | null;
  /** Un planning existe déjà : le régénérer remplacera celui-ci. */
  hasSessions: boolean;
}

/**
 * Durées proposées, en minutes par jour.
 *
 * Le choix compte : un planning bâti sur 90 minutes alors que l'élève en a
 * quatre — ou l'inverse — est inutilisable, et c'est la première chose qu'il
 * verra. Le laisser au défaut silencieux de la route serait une fausse économie.
 */
const DURATIONS = [30, 60, 90, 120, 180] as const;

export function PlanGenerator({ examDate, hasSessions }: PlanGeneratorProps) {
  const router = useRouter();
  const [minutes, setMinutes] = useState<number>(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sans date de concours, il n'y a pas de « jusqu'à quand » : la route
  // refuserait, et proposer le bouton quand même serait un bouton mort. Le
  // questionnaire d'accueil est le seul écran qui renseigne cette date — les
  // paramètres se contentent de l'afficher — et il est repassable sans dégât.
  if (!examDate) {
    return (
      <Card className="mb-6 p-5">
        <p className="flex items-start gap-2.5 text-sm text-slate-700">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          Indique ta date de concours : le planning se construit à rebours à
          partir d&apos;elle.
        </p>
        <Link href="/onboarding" className="mt-4 inline-block">
          <Button size="sm">Renseigner ma date</Button>
        </Link>
      </Card>
    );
  }

  async function generate() {
    setBusy(true);
    setError(null);

    const result = await postAi<{ created: number; skipped: number }>(
      "/api/ai/study-plan",
      { examDate, minutesPerDay: minutes },
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <Card className="mb-6 p-5">
      <p className="text-sm font-semibold text-slate-900">
        {hasSessions ? "Refaire le planning" : "Construire mon planning"}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        {hasSessions
          ? "Le planning actuel sera remplacé par le nouveau."
          : "Tes chapitres sont répartis jusqu'au concours, les moins maîtrisés en premier."}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-slate-600">Temps par jour</span>
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            disabled={busy}
            className="mt-1 h-10 rounded-card border border-cream-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand-400"
          >
            {DURATIONS.map((value) => (
              <option key={value} value={value}>
                {value >= 60
                  ? `${value / 60} h${value % 60 ? ` ${value % 60}` : ""}`
                  : `${value} min`}
              </option>
            ))}
          </select>
        </label>

        <Button onClick={() => void generate()} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {busy ? "Construction…" : hasSessions ? "Regénérer" : "Générer"}
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-red-600"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </Card>
  );
}
