"use client";

import { useMemo } from "react";
import { Check, Sparkles } from "lucide-react";
import { KHOLLE_FORMATS, type KholleFormat } from "@/lib/kholle/formats";
import { cn } from "@/lib/utils/cn";

interface FormatPickerProps {
  value: string;
  onChange: (formatId: string) => void;
  className?: string;
}

/**
 * Choix du format de khôlle.
 *
 * Les formats sont regroupés par famille de filières plutôt que listés à plat :
 * un étudiant cherche « ma prépa », pas « le format à deux phases ».
 */
export function FormatPicker({ value, onChange, className }: FormatPickerProps) {
  const groups = useMemo(() => {
    const map = new Map<string, KholleFormat[]>();
    for (const format of KHOLLE_FORMATS) {
      const family = familyOf(format);
      map.set(family, [...(map.get(family) ?? []), format]);
    }
    return [...map.entries()];
  }, []);

  return (
    <div className={cn("space-y-5", className)}>
      {groups.map(([family, formats]) => (
        <div key={family}>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {family}
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {formats.map((format) => {
              const selected = format.id === value;
              return (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => onChange(format.id)}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-card border p-4 text-left transition-colors",
                    selected
                      ? "border-brand-500 bg-brand-50"
                      : "border-cream-300 bg-white hover:border-brand-300",
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {format.label}
                    </span>
                    {selected && (
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
                    )}
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    {format.filieres.slice(0, 4).join(" · ")}
                    {format.filieres.length > 4 ? " · …" : ""}
                  </span>

                  <span className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-pill bg-cream-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-slate-600">
                      {format.totalMinutes} min
                    </span>
                    <span className="rounded-pill bg-cream-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {format.phases.filter((p) => p.minutes > 0).length} phases
                    </span>
                    {/* Ne promettre la prédiction du sujet que là où elle tient. */}
                    {format.predictable && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        <Sparkles className="size-2.5" aria-hidden />
                        sujet prédictible
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Famille affichée au-dessus d'un groupe de formats. */
function familyOf(format: KholleFormat): string {
  if (format.id === "grand-oral") return "Lycée";
  if (format.discipline === "langues") return "Langues, toutes filières";
  if (format.discipline === "lettres") return "Prépa littéraire";
  if (format.discipline === "esh") return "Prépa commerciale";
  return "Prépa scientifique";
}
