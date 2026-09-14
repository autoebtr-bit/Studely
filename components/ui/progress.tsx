import { cn } from "@/lib/utils/cn";

interface ProgressProps {
  /** Valeur d'avancement, de 0 à 100. */
  value: number;
  className?: string;
  indicatorClassName?: string;
  /** Description lue par les lecteurs d'écran. */
  label?: string;
}

export function Progress({
  value,
  className,
  indicatorClassName,
  label,
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-pill bg-cream-200", className)}
    >
      <div
        className={cn(
          "h-full rounded-pill bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-500",
          indicatorClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
