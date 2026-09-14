"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Clock, Loader2, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { postAi } from "@/lib/api/ai";
import type { ExerciseGrade } from "@/lib/ai/schemas";
import { XP_RULES } from "@/lib/xp/rules";

interface ExerciseWorkspaceProps {
  exerciseId: string;
  prompt: string;
  difficulty: string;
  minutes: number;
  chapterTitle: string;
}

/**
 * Le retour affiché est celui du schéma, pas une forme recopiée : si
 * `exerciseGradeSchema` évolue, c'est la compilation qui casse, pas l'écran.
 */
type Feedback = ExerciseGrade;

/** Seuil de réussite appliqué côté serveur pour l'attribution de l'XP. */
const PASS_SCORE = 50;

/**
 * Rédaction et correction d'un exercice.
 *
 * La correction vient de `/api/ai/grade-exercise`, qui enregistre aussi la
 * tentative et crédite l'XP par la RPC — jamais depuis ici.
 */
export function ExerciseWorkspace({
  exerciseId,
  prompt,
  difficulty,
  minutes,
  chapterTitle,
}: ExerciseWorkspaceProps) {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function correct() {
    if (!answer.trim()) return;
    setGrading(true);
    setError(null);

    const result = await postAi<Feedback>("/api/ai/grade-exercise", {
      exerciseId,
      answer: answer.trim(),
    });

    setGrading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setFeedback(result.data);
    // La tentative vient d'être enregistrée : la liste des exercices doit
    // cesser d'annoncer celui-ci comme jamais traité.
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/exercices"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tous les exercices
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="brand">{difficulty}</Badge>
          <span className="text-xs text-slate-500">{chapterTitle}</span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock className="size-3" aria-hidden />
            {minutes} min conseillées
          </span>
        </div>

        <p className="mt-4 text-base leading-relaxed text-slate-900">{prompt}</p>
      </Card>

      <Card className="mt-4 p-6">
        <label htmlFor="answer" className="text-sm font-medium text-slate-900">
          Ta réponse
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Rédige comme le jour de l&apos;épreuve : la correction porte aussi sur la
          rédaction.
        </p>
        <textarea
          id="answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={10}
          placeholder="Développe ton raisonnement…"
          className="mt-3 w-full resize-y rounded-card border border-cream-300 p-4 font-mono text-sm leading-relaxed outline-none transition-colors focus:border-brand-400"
        />

        <Button
          className="mt-4"
          onClick={() => void correct()}
          disabled={grading || !answer.trim()}
        >
          {grading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {grading ? "Correction en cours…" : "Faire corriger"}
        </Button>

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

      {feedback && (
        <Card className="mt-4 animate-fade-up p-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-slate-900">Correction</h2>
            <p className="text-2xl font-bold tabular-nums text-brand-600">
              {feedback.score}
              <span className="text-base text-slate-400">/100</span>
            </p>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            {feedback.comment}
          </p>

          <div className="mt-5 space-y-3">
            <div className="rounded-card border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-800">Ce qui marche</p>
              <ul className="mt-1.5 space-y-1 text-sm text-emerald-700">
                {feedback.strengths.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-card border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">À corriger</p>
              <ul className="mt-1.5 space-y-1 text-sm text-amber-700">
                {feedback.improvements.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Le serveur crédite `exercise_correct` au-dessus du seuil et
              `exercise_attempted` en dessous : annoncer l'un pour l'autre
              afficherait un gain que le compteur ne montrera jamais. */}
          <p className="mt-5 text-center text-sm font-semibold text-brand-700">
            +
            {feedback.score >= PASS_SCORE
              ? XP_RULES.exercise_correct.base
              : XP_RULES.exercise_attempted.base}{" "}
            XP
          </p>
        </Card>
      )}
    </div>
  );
}
