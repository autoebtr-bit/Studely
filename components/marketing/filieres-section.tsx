import { Clock, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/brand/section-heading";
import {
  KHOLLE_FORMATS,
  playablePhases,
  type KholleFormat,
} from "@/lib/kholle/formats";
import { cn } from "@/lib/utils/cn";

/**
 * Formats de khôlle couverts.
 *
 * La liste est lue depuis `lib/kholle/formats.ts`, jamais recopiée. Deux
 * conséquences voulues : la page ne peut pas annoncer un format que le moteur
 * ne sait pas jouer, et ajouter une filière met la vitrine à jour toute seule.
 */
export function FilieresSection() {
  return (
    <section id="filieres" className="border-y border-cream-200/70 bg-white py-24">
      <div className="section-shell">
        <SectionHeading
          eyebrow="Ta filière"
          title="Chaque filière a son format de khôlle"
          description="Une khôlle de maths ne ressemble pas à un exposé d'ESH ni à un compte rendu en langue. L'examinateur suit le déroulé et les critères de ta filière, pas un format générique."
          width="wide"
          className="mb-14"
        />

        <div
          data-reveal-group
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {KHOLLE_FORMATS.map((format) => (
            <FormatCard key={format.id} format={format} />
          ))}
        </div>

        <p data-reveal="fade" className="mt-8 text-center text-sm text-slate-500">
          Ta filière n&apos;est pas là ?{" "}
          <a href="#tarifs" className="font-semibold text-brand-600 hover:underline">
            Dis-nous laquelle
          </a>{" "}
          — un format se décrit en quelques lignes.
        </p>
      </div>
    </section>
  );
}

function FormatCard({ format }: { format: KholleFormat }) {
  const phases = playablePhases(format);

  return (
    <article className="hover-lift flex flex-col rounded-card border border-cream-200 bg-cream-50 p-6 hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{format.label}</h3>

        {/* Ne promettre la prédiction du sujet que là où elle tient réellement :
            les questions de cours ne sont énumérables qu'en filière scientifique. */}
        {format.predictable && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <Sparkles className="size-2.5" aria-hidden />
            sujet prédictible
          </span>
        )}
      </div>

      <p className="mt-1.5 text-xs text-slate-500">
        {format.filieres.join(" · ")}
      </p>

      {/* Le déroulé réel de l'épreuve, phase par phase. */}
      <ol className="mt-4 flex-1 space-y-1.5">
        {phases.map((phase, i) => (
          <li key={phase.id} className="flex items-baseline gap-2 text-sm">
            <span
              aria-hidden
              className="grid size-4 shrink-0 place-items-center rounded-full bg-cream-200 text-[10px] font-bold text-slate-500"
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-slate-700">{phase.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-slate-400">
              {phase.minutes} min
            </span>
          </li>
        ))}
      </ol>

      <p
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 border-t border-cream-200 pt-3",
          "text-xs font-medium tabular-nums text-slate-500",
        )}
      >
        <Clock className="size-3.5" aria-hidden />
        {format.totalMinutes} minutes au total
      </p>
    </article>
  );
}
