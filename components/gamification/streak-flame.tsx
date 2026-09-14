import { Flame } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StreakFlameProps {
  days: number;
  className?: string;
}

/** Compteur de jours consécutifs. S'éteint visuellement à 0. */
export function StreakFlame({ days, className }: StreakFlameProps) {
  const active = days > 0;

  return (
    <span
      title={active ? `${days} jours d'affilée` : "Aucune série en cours"}
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold tabular-nums",
        active ? "bg-amber-100 text-amber-700" : "bg-cream-100 text-slate-400",
        className,
      )}
    >
      <Flame className={cn("size-3.5", active && "fill-amber-500 text-amber-500")} aria-hidden />
      {days}
      <span className="sr-only">jours consécutifs</span>
    </span>
  );
}
