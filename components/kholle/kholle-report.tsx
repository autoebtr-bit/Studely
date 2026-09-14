"use client";

import { RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { KholleGrade, KholleSubject } from "@/lib/ai/schemas";
import type { KholleFormat } from "@/lib/kholle/formats";
import { CriterionBreakdown } from "@/components/kholle/criterion-breakdown";
import { cn } from "@/lib/utils/cn";

interface KholleReportProps {
  format: KholleFormat;
  grade: KholleGrade;
  subject: KholleSubject;
  /** Le khôlleur qui vient de faire passer l'oral, au génitif : « d'Hélène ». */
  examinerPossessive: string;
  onRestart: () => void;
}

/** Couleur d'une note sur 20, selon les seuils usuels d'une khôlle. */
function toneFor(score: number): string {
  if (score >= 14) return "text-emerald-600";
  if (score >= 10) return "text-amber-600";
  return "text-red-600";
}

/**
 * Fiche de khôlle.
 *
 * Reprend la structure d'une vraie fiche de khôlleur : une note, un
 * commentaire par critère, ce qui a manqué, et l'appréciation générale. Les
 * réponses attendues ne sont montrées qu'ici — jamais pendant l'épreuve.
 */
export function KholleReport({
  format,
  grade,
  subject,
  examinerPossessive,
  onRestart,
}: KholleReportProps) {
  return (
    <div className="space-y-4">
      <Card className="p-7 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
          La fiche {examinerPossessive}
        </p>

        <p className={cn("mt-3 text-6xl font-extrabold tabular-nums", toneFor(grade.score))}>
          {grade.score.toFixed(grade.score % 1 === 0 ? 0 : 1)}
          <span className="text-2xl text-slate-400">/20</span>
        </p>

        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-700">
          {grade.verdict}
        </p>
      </Card>

      {/* Détail par critère */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Détail de la note</h2>

        {/* Les pondérations expliquent quoi rattraper en priorité : 11 sur un
            critère qui pèse 25 % coûte plus cher que 14 sur un qui pèse 20 %. */}
        <CriterionBreakdown
          criteria={format.criteria}
          entries={grade.perCriterion}
          className="mt-4"
        />

        <ul className="mt-5 space-y-3 border-t border-cream-200 pt-4">
          {grade.perCriterion.map((entry) => {
            const criterion = format.criteria.find((c) => c.id === entry.criterionId);
            return (
              <li key={entry.criterionId}>
                <p className="text-xs font-semibold text-slate-700">
                  {criterion?.label ?? entry.criterionId}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {entry.comment}
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-emerald-200 bg-emerald-50/60 p-5">
          <h2 className="text-sm font-semibold text-emerald-800">Ce qui a marché</h2>
          <ul className="mt-2.5 space-y-1.5 text-sm text-emerald-700">
            {grade.strengths.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden>•</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="border-amber-200 bg-amber-50/60 p-5">
          <h2 className="text-sm font-semibold text-amber-800">À corriger</h2>
          <ul className="mt-2.5 space-y-1.5 text-sm text-amber-700">
            {grade.improvements.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden>•</span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {grade.missedPoints.length > 0 && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Points attendus non abordés
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            C&apos;est ce qu&apos;un khôlleur aurait relevé sur sa fiche.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            {grade.missedPoints.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-red-500">
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Corrigé, volontairement en dernier */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-900">Réponses attendues</h2>
        <div className="mt-4 space-y-5">
          {subject.phases.map((phase) => {
            const meta = format.phases.find((p) => p.id === phase.phaseId);
            return (
              <div key={phase.phaseId}>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {meta?.label ?? phase.phaseId}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {phase.prompt}
                </p>
                <p className="mt-2 whitespace-pre-line rounded-card bg-cream-100 p-4 text-sm leading-relaxed text-slate-700">
                  {phase.modelAnswer}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-center pt-2">
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw />
          Nouvelle khôlle
        </Button>
      </div>
    </div>
  );
}
