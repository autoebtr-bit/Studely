import { cn } from "@/lib/utils/cn";

interface XpChartProps {
  /** XP par jour, le dernier élément étant aujourd'hui. */
  values: number[];
  className?: string;
}

/**
 * Histogramme d'XP quotidienne.
 *
 * Rendu en pur CSS plutôt qu'avec une librairie de graphiques : une trentaine
 * de barres ne justifie pas 40 Ko de JavaScript côté client.
 */
export function XpChart({ values, className }: XpChartProps) {
  const max = Math.max(1, ...values);
  const total = values.reduce((s, v) => s + v, 0);

  return (
    <figure className={className}>
      <div className="flex h-32 items-end gap-[3px]" role="img"
        aria-label={`Histogramme de l'expérience gagnée sur ${values.length} jours, ${total} XP au total`}
      >
        {values.map((value, i) => {
          const heightPct = (value / max) * 100;
          const isToday = i === values.length - 1;

          return (
            <div
              key={i}
              title={`${value} XP`}
              className={cn(
                "flex-1 rounded-t-[3px] transition-colors",
                value === 0
                  ? "bg-cream-200"
                  : isToday
                    ? "bg-brand-600"
                    : "bg-brand-300 hover:bg-brand-400",
              )}
              style={{ height: `${Math.max(3, heightPct)}%` }}
            />
          );
        })}
      </div>

      <figcaption className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>Il y a {values.length} jours</span>
        <span className="tabular-nums">{total} XP au total</span>
        <span>Aujourd&apos;hui</span>
      </figcaption>
    </figure>
  );
}
