"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Mic } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CriterionBreakdown } from "@/components/kholle/criterion-breakdown";
import { CriterionTrend } from "@/components/kholle/criterion-trend";
import { getFormat } from "@/lib/kholle/formats";
import {
  formatScore,
  scoresFor,
  weakestCriterion,
  type KholleHistoryEntry,
} from "@/lib/kholle/history";
import { cn } from "@/lib/utils/cn";

interface KholleProgressProps {
  /** Séances de la plus ancienne à la plus récente. */
  history: KholleHistoryEntry[];
  /** Masque l'appel à l'action : la vitrine illustre, elle ne pilote pas. */
  showCta?: boolean;
  className?: string;
}

/**
 * La progression aux khôlles, critère par critère.
 *
 * Les critères à gauche commandent la courbe à droite. L'écran s'ouvre sur le
 * **critère le plus faible** : c'est celui qui a besoin d'être regardé, et
 * ouvrir sur le meilleur flatterait sans rien apprendre.
 *
 * Le même composant sert dans l'application, sur les vraies séances, et sur la
 * vitrine avec des données d'exemple — ce qui garantit que l'illustration
 * montre exactement ce que le produit fait.
 */
export function KholleProgress({
  history,
  showCta = true,
  className,
}: KholleProgressProps) {
  const latest = history[history.length - 1];
  const format = latest ? getFormat(latest.formatId) : undefined;
  const criteria = useMemo(() => format?.criteria ?? [], [format]);

  const defaultId = useMemo(
    () => weakestCriterion(history, criteria.map((c) => c.id)),
    [history, criteria],
  );
  const [picked, setPicked] = useState<string | null>(null);

  const selectedId = picked ?? defaultId;
  const selected = criteria.find((c) => c.id === selectedId);

  if (!latest || !format || !selected) {
    return <EmptyState showCta={showCta} className={className} />;
  }

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Tes khôlles</h2>
        {/* « globale » n'est pas décoratif : sans ce mot, cette note se
            confond avec celle du critère affiché dans le graphique. */}
        <p className="text-xs text-slate-500">
          {history.length} khôlle{history.length > 1 ? "s" : ""} · dernière note
          globale{" "}
          <span className="font-semibold tabular-nums text-slate-700">
            {formatScore(latest.score)}/20
          </span>
        </p>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
        <div className="min-w-0">
          <CriterionBreakdown
            criteria={criteria}
            entries={latest.criteria}
            selectedId={selectedId}
            onSelect={setPicked}
          />
          <p className="mt-3 px-2.5 text-xs text-slate-400">
            Choisis un critère pour suivre son évolution.
          </p>
        </div>

        <div className="min-w-0">
          <CriterionTrend
            scores={scoresFor(history, selected.id)}
            label={selected.label}
          />
        </div>
      </div>
    </Card>
  );
}

/**
 * Ce que voit tout nouvel inscrit.
 *
 * C'est le premier contact avec l'écran, il ne doit pas ressembler à une panne :
 * on explique ce qui se passera et on propose la seule action utile.
 */
function EmptyState({
  showCta,
  className,
}: {
  showCta: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("p-8 text-center", className)}>
      <span
        aria-hidden
        className="gradient-sunset mx-auto grid size-11 place-items-center rounded-card text-white"
      >
        <Mic className="size-5" />
      </span>

      <h2 className="mt-4 text-sm font-semibold text-slate-900">
        Ta première khôlle apparaîtra ici
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600">
        Après chaque khôlle blanche, ta note et le détail par critère viennent se
        ranger sur cette courbe. C&apos;est elle qui montre ce qui progresse et
        ce qui bloque encore.
      </p>

      {showCta && (
        <Link
          href="/kholle"
          className={cn(buttonVariants({ size: "md" }), "mt-5")}
        >
          Passer une khôlle
        </Link>
      )}
    </Card>
  );
}
