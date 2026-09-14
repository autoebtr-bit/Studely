"use client";

import { cn } from "@/lib/utils/cn";

interface XpToastProps {
  amount: number;
  show: boolean;
  className?: string;
}

/**
 * Bulle « +N XP » qui s'élève puis disparaît.
 *
 * Le composant est piloté par une `key` changeante côté parent : remonter le
 * composant est ce qui rejoue l'animation CSS, sans état ni minuteur.
 */
export function XpToast({ amount, show, className }: XpToastProps) {
  if (!show || amount <= 0) return null;

  return (
    <span
      aria-live="polite"
      className={cn(
        "pointer-events-none absolute right-5 top-5 animate-xp-rise rounded-pill",
        "bg-brand-600 px-3 py-1 text-sm font-bold text-white shadow-lift",
        className,
      )}
    >
      +{amount} XP
    </span>
  );
}
