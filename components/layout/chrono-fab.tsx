"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const PRESETS = [
  { label: "25 min", seconds: 25 * 60 },
  { label: "45 min", seconds: 45 * 60 },
  { label: "10 min", seconds: 10 * 60 },
] as const;

function format(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Minuteur de session flottant (capture 3, bouton « Chrono » bas-droite).
 *
 * Le décompte est calculé depuis un horodatage de fin, pas par décrémentation :
 * un onglet mis en arrière-plan ralentit `setInterval`, ce qui ferait dériver
 * un compteur naïf.
 */
export function ChronoFab() {
  const [open, setOpen] = useState(false);
  const [duration, setDuration] = useState<number>(PRESETS[0].seconds);
  const [remaining, setRemaining] = useState<number>(PRESETS[0].seconds);
  const [running, setRunning] = useState(false);
  const endAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    const tick = () => {
      if (endAtRef.current === null) return;
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        endAtRef.current = null;
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    endAtRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }, [remaining]);

  const pause = useCallback(() => {
    setRunning(false);
    endAtRef.current = null;
  }, []);

  const reset = useCallback(
    (seconds = duration) => {
      setRunning(false);
      endAtRef.current = null;
      setDuration(seconds);
      setRemaining(seconds);
    },
    [duration],
  );

  const pct = duration === 0 ? 0 : ((duration - remaining) / duration) * 100;
  const finished = remaining === 0;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="w-64 animate-fade-up rounded-card border border-cream-200 bg-white p-4 shadow-lift">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Session de révision</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer le chrono"
              className="rounded-full p-1 text-slate-400 hover:bg-cream-100"
            >
              <X className="size-4" />
            </button>
          </div>

          <p
            className={cn(
              "mt-3 text-center text-4xl font-bold tabular-nums tracking-tight",
              finished ? "text-emerald-600" : "text-slate-900",
            )}
            aria-live="polite"
          >
            {format(remaining)}
          </p>

          <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-cream-200">
            <div
              className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-3 flex gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => reset(preset.seconds)}
                className={cn(
                  "flex-1 rounded-pill px-2 py-1.5 text-xs font-medium transition-colors",
                  duration === preset.seconds
                    ? "bg-brand-600 text-white"
                    : "bg-cream-100 text-slate-700 hover:bg-cream-200",
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={running ? pause : start}
              disabled={finished}
            >
              {running ? <Pause /> : <Play />}
              {running ? "Pause" : "Démarrer"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => reset()}
              aria-label="Réinitialiser"
            >
              <RotateCcw />
            </Button>
          </div>

          {finished && (
            <p className="mt-2.5 text-center text-xs font-medium text-emerald-600">
              Session terminée. Pense à faire une pause.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-pill bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-fab transition-transform hover:scale-105 active:scale-100"
      >
        <Timer className="size-4" aria-hidden />
        {running ? (
          <span className="tabular-nums">{format(remaining)}</span>
        ) : (
          "Chrono"
        )}
      </button>
    </div>
  );
}
