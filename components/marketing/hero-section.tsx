import { PlayCircle } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { FloatingCallout } from "./floating-callout";
import { HeroMockup } from "./hero-mockup";
import { HERO, HERO_CALLOUTS } from "@/lib/marketing/content";

/**
 * Section d'ouverture.
 *
 * Composition en couches : halo d'ambiance, orbe en dégradé, croix abstraite,
 * puis la maquette au premier plan. Les ornements sont masqués sous `sm` — sur
 * un écran étroit ils encombreraient le message au lieu de le servir.
 */
export function HeroSection() {
  return (
    <section
      id="accueil"
      className="relative overflow-hidden pb-24 pt-10 sm:pt-14 md:pb-32 md:pt-20"
    >
      {/* Halo d'ambiance haut */}
      <div
        aria-hidden
        className="ambient-glow -top-24 left-1/2 h-[350px] w-[700px] max-w-[110vw] -translate-x-1/2 bg-gradient-to-r from-brand-200/50 via-blush-400/25 to-accent-200/50"
      />

      <div className="section-shell text-center">
        {/* Étiquette */}
        <div className="mb-8 inline-flex animate-fade-in items-center gap-2 rounded-pill border border-cream-200 bg-white/90 px-4 py-1.5 text-xs font-semibold text-slate-800 shadow-sm sm:text-sm">
          <span aria-hidden className="text-base">
            ✨
          </span>
          {HERO.badge}
          <span
            aria-hidden
            className="inline-block size-1.5 animate-halo-pulse rounded-full bg-brand-500"
          />
        </div>

        {/* Titre */}
        <h1 className="mx-auto mb-6 max-w-4xl text-[2.5rem] font-extrabold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl md:text-7xl">
          {HERO.titleLead}{" "}
          <span className="gradient-sunset-text">{HERO.titleAccent}</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-xl">
          {HERO.subtitle}
        </p>

        {/* Actions */}
        <div className="mb-16 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <GradientButton href={HERO.primaryCta.href} size="lg" className="w-full sm:w-auto">
            {HERO.primaryCta.label}
          </GradientButton>

          <GradientButton
            href={HERO.secondaryCta.href}
            tone="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <PlayCircle className="text-brand-500" />
            {HERO.secondaryCta.label}
          </GradientButton>
        </div>

        {/* Visuel central */}
        <div className="relative mx-auto max-w-4xl pt-6">
          {/* Orbe en dégradé */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 -z-10 size-72 animate-orb-drift rounded-full gradient-orb opacity-90 shadow-2xl shadow-accent-500/30 sm:size-[440px]"
          />

          {/* Croix abstraite */}
          <div
            aria-hidden
            className="absolute -right-10 bottom-6 hidden size-40 rotate-12 animate-float-reverse rounded-[36px] gradient-cross opacity-90 drop-shadow-xl sm:block"
          />

          <FloatingCallout
            side="left"
            text={HERO_CALLOUTS.left.text}
            avatars={HERO_CALLOUTS.left.avatars}
            className="absolute left-0 top-12 z-20 lg:left-4"
          />

          <FloatingCallout
            side="right"
            text={HERO_CALLOUTS.right.text}
            avatars={HERO_CALLOUTS.right.avatars}
            className="absolute right-0 top-16 z-20 lg:right-6"
          />

          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
