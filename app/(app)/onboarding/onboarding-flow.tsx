"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { XP_RULES } from "@/lib/xp/rules";
import { cn } from "@/lib/utils/cn";
import { completeOnboarding } from "./actions";

const STUDY_LEVELS = [
  "Seconde",
  "Première",
  "Terminale",
  "Prépa",
  "Licence",
  "Master",
  "Autre",
] as const;

const SUBJECT_CHOICES = [
  { name: "Mathématiques", emoji: "📐" },
  { name: "Physique-Chimie", emoji: "⚗️" },
  { name: "SVT", emoji: "🧬" },
  { name: "Philosophie", emoji: "🏛️" },
  { name: "Histoire-Géographie", emoji: "🗺️" },
  { name: "Français", emoji: "📖" },
  { name: "Anglais", emoji: "🇬🇧" },
  { name: "Espagnol", emoji: "🇪🇸" },
  { name: "SES", emoji: "📊" },
  { name: "NSI", emoji: "💻" },
  { name: "Économie", emoji: "💶" },
  { name: "Droit", emoji: "⚖️" },
] as const;

const TOTAL_STEPS = 3;

/**
 * Parcours d'accueil en trois étapes.
 *
 * La validation finale appelle une Server Action qui renseigne le profil, crée
 * les matières choisies et crédite l'XP d'accueil. Sans elle, l'élève
 * répondait à trois questions dont rien n'était conservé.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState<string>("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [examDate, setExamDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSubject(name: string) {
    setSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name],
    );
  }

  const canContinue =
    (step === 0 && level !== "") ||
    (step === 1 && subjects.length > 0) ||
    (step === 2 && examDate !== "");

  async function next() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }

    setSaving(true);
    setError(null);

    const chosen = SUBJECT_CHOICES.filter((s) => subjects.includes(s.name)).map(
      (s) => ({ name: s.name, emoji: s.emoji }),
    );

    const result = await completeOnboarding({ level, subjects: chosen, examDate });

    // `ok` avec un message : le profil est enregistré, seules les matières ont
    // échoué. On laisse entrer plutôt que de bloquer sur un détail réparable.
    if (!result.ok) {
      setError(result.error ?? "L'enregistrement a échoué. Réessaie.");
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // Bornes du sélecteur de date : demain au plus tôt, trois ans au plus tard.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 3);

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <p className="text-xs font-medium tabular-nums text-slate-500">
          Étape {step + 1} sur {TOTAL_STEPS}
        </p>
        <Progress
          value={((step + 1) / TOTAL_STEPS) * 100}
          className="mt-2"
          label="Avancement de la configuration"
        />
      </div>

      <Card className="p-6">
        {step === 0 && (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Où en es-tu dans tes études ?
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Cela calibre le niveau des exercices et des colles.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {STUDY_LEVELS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLevel(option)}
                  aria-pressed={level === option}
                  className={cn(
                    "rounded-card border px-3 py-3 text-sm font-medium transition-colors",
                    level === option
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-cream-300 bg-white text-slate-800 hover:border-brand-300",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Quelles matières travailles-tu ?
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Choisis-en au moins une. Tu pourras en ajouter plus tard.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {SUBJECT_CHOICES.map((subject) => {
                const selected = subjects.includes(subject.name);
                return (
                  <button
                    key={subject.name}
                    type="button"
                    onClick={() => toggleSubject(subject.name)}
                    aria-pressed={selected}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-pill border px-3.5 py-2 text-sm transition-colors",
                      selected
                        ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                        : "border-cream-300 bg-white text-slate-800 hover:border-brand-300",
                    )}
                  >
                    <span aria-hidden>{subject.emoji}</span>
                    {subject.name}
                    {selected && <Check className="size-3.5" aria-hidden />}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-slate-500">
              {subjects.length} matière{subjects.length > 1 ? "s" : ""} sélectionnée
              {subjects.length > 1 ? "s" : ""}
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Quand as-tu ton examen ?
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              C&apos;est à partir de cette date que le planning se construit à
              rebours.
            </p>

            <label htmlFor="examDate" className="mt-5 block text-sm font-medium text-slate-900">
              Date de l&apos;examen
            </label>
            <input
              id="examDate"
              type="date"
              value={examDate}
              min={tomorrow.toISOString().slice(0, 10)}
              max={maxDate.toISOString().slice(0, 10)}
              onChange={(e) => setExamDate(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-card border border-cream-300 px-3.5 text-sm outline-none transition-colors focus:border-brand-400"
            />

            <p className="mt-5 rounded-card bg-brand-50 p-3.5 text-sm text-brand-700">
              Tu gagneras {XP_RULES.onboarding_completed.base} XP en terminant
              cette configuration.
            </p>
          </>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-card border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-800"
          >
            {error}
          </p>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            <ArrowLeft />
            Retour
          </Button>

          <Button onClick={next} disabled={!canContinue || saving}>
            {saving && <Loader2 className="animate-spin" />}
            {step === TOTAL_STEPS - 1 ? "Terminer" : "Continuer"}
            {!saving && step < TOTAL_STEPS - 1 && <ArrowRight />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
