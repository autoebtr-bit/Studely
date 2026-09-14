"use client";

import type { KholleCriterion } from "@/lib/kholle/formats";
import { MAX_SCORE, formatScore } from "@/lib/kholle/history";
import { cn } from "@/lib/utils/cn";

export interface BreakdownEntry {
  criterionId: string;
  score: number;
}

interface CriterionBreakdownProps {
  criteria: KholleCriterion[];
  entries: BreakdownEntry[];
  /** Critère mis en avant, quand la liste sert aussi de sélecteur. */
  selectedId?: string | null;
  onSelect?: (criterionId: string) => void;
  className?: string;
}

/**
 * Les notes par critère, avec leur pondération.
 *
 * La pondération n'est pas décorative : elle explique pourquoi 11 en initiative
 * pèse plus lourd que 14 en réaction aux relances. Sans elle, l'élève lit
 * quatre notes sans savoir laquelle rattraper en priorité.
 *
 * Deux usages, d'où `onSelect` : figé sur la fiche d'une khôlle, cliquable sur
 * l'écran de progression où il commande la courbe.
 */
export function CriterionBreakdown({
  criteria,
  entries,
  selectedId,
  onSelect,
  className,
}: CriterionBreakdownProps) {
  const interactive = typeof onSelect === "function";

  return (
    <ul className={cn("space-y-3", className)}>
      {criteria.map((criterion) => {
        const entry = entries.find((e) => e.criterionId === criterion.id);
        if (!entry) return null;

        const selected = selectedId === criterion.id;
        const pct = (entry.score / MAX_SCORE) * 100;

        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm font-medium text-slate-900">
                {criterion.label}{" "}
                <span className="font-normal text-slate-400">
                  · {criterion.weight} %
                </span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-sm font-bold tabular-nums",
                  toneFor(entry.score),
                )}
              >
                {formatScore(entry.score)}
              </span>
            </span>

            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-pill bg-cream-200">
              <span
                className={cn(
                  "block h-full rounded-pill",
                  selected || !interactive ? "gradient-sunset" : "bg-brand-300",
                )}
                style={{ width: `${pct}%` }}
              />
            </span>
          </>
        );

        if (!interactive) {
          return (
            <li key={criterion.id} className="block">
              {body}
            </li>
          );
        }

        return (
          <li key={criterion.id}>
            <button
              type="button"
              onClick={() => onSelect(criterion.id)}
              aria-pressed={selected}
              className={cn(
                "w-full rounded-card px-2.5 py-2 text-left transition-colors",
                selected ? "bg-brand-50" : "hover:bg-cream-100",
              )}
            >
              {body}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Couleur d'une note sur 20, selon les seuils usuels d'une khôlle. */
function toneFor(score: number): string {
  if (score >= 14) return "text-emerald-600";
  if (score >= 10) return "text-amber-600";
  return "text-red-600";
}

