"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface PhaseTimerProps {
  /** Durée de la phase, en minutes. */
  minutes: number;
  /** Remis à zéro quand cette clé change. */
  resetKey: string;
  running: boolean;
  className?: string;
}

function format(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(totalSeconds);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return `${sign}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Décompte d'une phase de khôlle.
 *
 * Le temps est calculé depuis un horodatage de départ, jamais par
 * décrémentation : un onglet en arrière-plan ralentit `setInterval` et un
 * compteur naïf dériverait.
 *
 * Le décompte continue en négatif au-delà de la durée plutôt que de s'arrêter :
 * un vrai khôlleur laisse finir une phrase, mais le dépassement se voit.
 */
export function PhaseTimer({
  minutes,
  resetKey,
  running,
  className,
}: PhaseTimerProps) {
  const total = minutes * 60;
  const [remaining, setRemaining] = useState(total);
  const startedAtRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  // Nouvelle phase : on repart de zéro.
  useEffect(() => {
    startedAtRef.current = null;
    elapsedRef.current = 0;
    setRemaining(total);
  }, [resetKey, total]);

  useEffect(() => {
    if (!running) {
      // Mise en pause : on fige le temps déjà écoulé.
      if (startedAtRef.current !== null) {
        elapsedRef.current += (Date.now() - startedAtRef.current) / 1000;
        startedAtRef.current = null;
      }
      return;
    }

    startedAtRef.current = Date.now();

    const tick = () => {
      const live =
        startedAtRef.current === null
          ? 0
          : (Date.now() - startedAtRef.current) / 1000;
      setRemaining(Math.round(total - (elapsedRef.current + live)));
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [running, total, resetKey]);

  const overtime = remaining < 0;
  const nearlyOver = !overtime && remaining <= 60;

  return (
    <span
      aria-live="off"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-sm font-semibold tabular-nums transition-colors",
        overtime
          ? "bg-red-50 text-red-700"
          : nearlyOver
            ? "bg-amber-50 text-amber-700"
            : "bg-cream-100 text-slate-600",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          running ? "bg-current" : "bg-current opacity-40",
        )}
      />
      {format(remaining)}
      <span className="sr-only">
        {overtime ? "temps dépassé" : "temps restant"}
      </span>
    </span>
  );
}
