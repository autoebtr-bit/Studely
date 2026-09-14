import { levelProgress } from "@/lib/xp/level";
import { LevelBadge } from "./level-badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils/cn";

interface XpBarProps {
  xpTotal: number;
  /** Variante compacte pour la topbar ; sinon bloc complet. */
  compact?: boolean;
  className?: string;
}

/** Affiche niveau, titre et avancement vers le niveau suivant. */
export function XpBar({ xpTotal, compact = false, className }: XpBarProps) {
  const p = levelProgress(xpTotal);

  const remaining =
    p.xpForNextLevel === null ? null : p.xpForNextLevel - p.xpIntoLevel;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <LevelBadge level={p.level} size="sm" />
        <div className="hidden w-28 sm:block">
          <Progress
            value={p.pct}
            className="h-1.5"
            label={`Progression vers le niveau ${p.level + 1}`}
          />
          <p className="mt-1 text-[10px] font-medium tabular-nums text-slate-500">
            {remaining === null
              ? "Niveau max"
              : `${remaining} XP → N${p.level + 1}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <LevelBadge level={p.level} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-semibold text-slate-900">
            Niveau {p.level} · {p.title}
          </p>
          <p className="shrink-0 text-sm tabular-nums text-slate-500">
            {p.xpTotal.toLocaleString("fr-FR")} XP
          </p>
        </div>
        <Progress
          value={p.pct}
          className="mt-2"
          label={`Progression vers le niveau ${p.level + 1}`}
        />
        <p className="mt-1.5 text-xs tabular-nums text-slate-500">
          {remaining === null
            ? "Niveau maximum atteint"
            : `Encore ${remaining} XP pour atteindre le niveau ${p.level + 1}`}
        </p>
      </div>
    </div>
  );
}
