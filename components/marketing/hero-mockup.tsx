import { Mic, Volume2 } from "lucide-react";
import { HERO_MOCKUP } from "@/lib/marketing/content";
import { cn } from "@/lib/utils/cn";

/**
 * Aperçu du produit dans le hero : une khôlle en train de se dérouler.
 *
 * C'est l'élément le plus convaincant de la page. Un chatbot généraliste sait
 * résumer un cours ; aucun ne fait passer une épreuve orale avec relances. Le
 * montrer vaut mieux que le décrire.
 *
 * Construit en HTML plutôt qu'en capture d'écran : le rendu reste net à toutes
 * les tailles, suit le thème, et ne se périme pas quand le produit évolue.
 */
export function HeroMockup() {
  return (
    <div className="relative mx-auto max-w-2xl rounded-card border border-white bg-white/95 p-4 text-left shadow-2xl shadow-accent-900/10 backdrop-blur-xl sm:p-7">
      {/* Barre de fenêtre */}
      <div className="flex items-center justify-between gap-3 border-b border-cream-100 pb-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-3 shrink-0 rounded-full bg-brand-400" aria-hidden />
          <span className="size-3 shrink-0 rounded-full bg-amber-400" aria-hidden />
          <span className="size-3 shrink-0 rounded-full bg-emerald-400" aria-hidden />
          <span className="ml-2 truncate text-xs font-semibold text-slate-500">
            {HERO_MOCKUP.sessionLabel}
          </span>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-cream-100 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-600">
          <span className="size-1.5 rounded-full bg-brand-500" aria-hidden />
          {HERO_MOCKUP.timer}
        </span>
      </div>

      {/* Fil des phases */}
      <div className="flex flex-wrap items-center gap-1.5 pt-4">
        {HERO_MOCKUP.phases.map((phase) => (
          <span
            key={phase.label}
            className={cn(
              "rounded-pill px-3 py-1 text-[11px] font-semibold",
              phase.state === "en-cours"
                ? "bg-ink-900 text-white"
                : "bg-cream-100 text-slate-500",
            )}
          >
            {phase.label}
          </span>
        ))}
      </div>

      {/* Le sujet */}
      <div className="mt-4 rounded-2xl border border-cream-100 bg-cream-50/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {HERO_MOCKUP.phaseLabel}
          </p>
          <span
            aria-hidden
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-600"
          >
            <Volume2 className="size-3" />
            Réécouter
          </span>
        </div>

        <p className="mt-1.5 text-sm font-medium leading-snug text-slate-900 sm:text-base">
          {HERO_MOCKUP.prompt}
        </p>
      </div>

      {/* La relance — ce que personne d'autre ne fait */}
      <div className="mt-3 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full gradient-sunset text-white">
          <Mic className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-bold text-brand-700">
            {HERO_MOCKUP.relance.author}
          </p>
          <p className="text-xs leading-relaxed text-slate-700 sm:text-sm">
            « {HERO_MOCKUP.relance.message} »
          </p>
        </div>
      </div>
    </div>
  );
}
