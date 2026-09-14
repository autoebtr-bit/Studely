import {
  MAX_SCORE,
  formatScore,
  progression,
  trendPoints,
} from "@/lib/kholle/history";
import { cn } from "@/lib/utils/cn";

interface CriterionTrendProps {
  /** Notes du critère, de la plus ancienne à la plus récente. */
  scores: number[];
  /** Libellé du critère suivi, écrit sous la courbe. */
  label: string;
  className?: string;
}

/*
 * Repère du dessin, en unités de la `viewBox`.
 * La zone de tracé est volontairement plus petite que la vue : il faut de la
 * place pour les graduations à gauche, la valeur au-dessus du dernier point, et
 * les libellés en dessous. Sans ces marges, le texte sort du cadre.
 */
const VIEW = { w: 340, h: 170 };
const PLOT = { left: 56, right: 306, top: 26, bottom: 122 };

/**
 * Évolution d'un critère, khôlle après khôlle.
 *
 * Dessinée à la main en SVG : une poignée de points ne justifie pas une
 * librairie de graphiques — même parti pris que `XpChart`.
 *
 * **L'échelle va toujours de 0 à 20**, jamais cadrée sur les valeurs. Un axe
 * qui démarrerait à 8 ferait passer deux points de mieux pour un bond. Sur la
 * note d'un élève, ce serait mentir avec un axe.
 */
export function CriterionTrend({ scores, label, className }: CriterionTrendProps) {
  const points = trendPoints(scores);

  if (points.length === 0) {
    return (
      <p className={cn("text-sm text-slate-500", className)}>
        Pas encore de note sur ce critère.
      </p>
    );
  }

  const x = (pct: number) => PLOT.left + (pct / 100) * (PLOT.right - PLOT.left);
  const y = (pct: number) => PLOT.top + (pct / 100) * (PLOT.bottom - PLOT.top);

  const coords = points.map((p) => ({ ...p, cx: x(p.x), cy: y(p.y) }));
  const last = coords[coords.length - 1]!;
  const line = coords.map((p) => `${p.cx} ${p.cy}`).join(" L ");

  const delta = progression(scores);

  return (
    <figure className={className}>
      {/*
        Le nom du critère est AU-DESSUS de la courbe, pas en légende dessous :
        la grande valeur accrochée au dernier point se lit d'abord, et sans
        titre au-dessus elle passe pour la note globale de la khôlle.
      */}
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 text-sm font-semibold text-slate-900">
          {label}
          <span className="ml-1.5 font-normal text-slate-400">
            · note du critère, sur 20
          </span>
        </span>
        {delta !== null && (
          <span
            className={cn(
              "shrink-0 text-xs font-medium tabular-nums",
              delta > 0
                ? "text-emerald-600"
                : delta < 0
                  ? "text-red-600"
                  : "text-slate-500",
            )}
          >
            {delta > 0 ? "+" : ""}
            {formatScore(delta)} depuis la première
          </span>
        )}
      </figcaption>

      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        className="h-auto w-full max-w-full"
        role="img"
        aria-label={ariaLabel(label, scores)}
      >
        {/* Graduations : seulement 0, 10 et 20, les seules qui se lisent. */}
        {[0, 10, MAX_SCORE].map((tick) => {
          const ty = y(100 - (tick / MAX_SCORE) * 100);
          return (
            <g key={tick}>
              <line
                x1={PLOT.left}
                y1={ty}
                x2={PLOT.right}
                y2={ty}
                className={tick === 0 ? "stroke-cream-300" : "stroke-cream-200"}
                strokeWidth="1"
              />
              <text
                x={PLOT.left - 10}
                y={ty + 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] tabular-nums"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Aire sous la courbe, puis la courbe elle-même. */}
        {coords.length > 1 && (
          <>
            <path
              d={`M ${line} L ${last.cx} ${y(100)} L ${coords[0]!.cx} ${y(100)} Z`}
              className="fill-brand-500/10"
            />
            <path
              d={`M ${line}`}
              fill="none"
              className="stroke-brand-500"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}

        {coords.map((p, i) => {
          const isLast = i === coords.length - 1;
          return (
            <circle
              key={p.label}
              cx={p.cx}
              cy={p.cy}
              r={isLast ? 4.5 : 3}
              className={cn(
                "stroke-brand-500",
                isLast ? "fill-brand-500" : "fill-cream-50",
              )}
              strokeWidth="2"
            />
          );
        })}

        {/* La dernière note écrite en clair : c'est celle qu'on vient d'avoir. */}
        <text
          x={last.cx}
          y={last.cy - 12}
          textAnchor="middle"
          className="fill-slate-900 text-[11px] font-semibold tabular-nums"
        >
          {formatScore(last.score)}
        </text>

        {coords.map((p) => (
          <text
            key={p.label}
            x={p.cx}
            y={PLOT.bottom + 20}
            textAnchor="middle"
            className="fill-slate-400 text-[10px]"
          >
            {p.label}
          </text>
        ))}
      </svg>

    </figure>
  );
}

function ariaLabel(label: string, scores: number[]): string {
  if (scores.length === 1) {
    return `${label} : ${formatScore(scores[0]!)} sur 20 à la première khôlle.`;
  }
  return (
    `Évolution de « ${label} » sur ${scores.length} khôlles, en notes sur 20 : ` +
    `${scores.map(formatScore).join(", ")}.`
  );
}
