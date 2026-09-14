import { GradientButton } from "@/components/ui/gradient-button";
import { FINAL_CTA } from "@/lib/marketing/content";

/** Dernier appel à l'action, en pavé plein dégradé. */
export function FinalCtaSection() {
  return (
    <section className="bg-cream-50 py-20">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-8">
        <div
          data-reveal="scale"
          className="gradient-sunset relative overflow-hidden rounded-card p-10 text-center text-white shadow-2xl shadow-brand-500/30 sm:p-16"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 size-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-10 -left-10 size-64 rounded-full bg-accent-900/20 blur-2xl"
          />

          <span className="mb-6 inline-block rounded-pill bg-white/20 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
            {FINAL_CTA.badge}
          </span>

          <h2 className="mx-auto max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            {FINAL_CTA.title}
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-base font-medium text-white/90 sm:text-lg">
            {FINAL_CTA.description}
          </p>

          <div className="mt-8">
            <GradientButton href={FINAL_CTA.cta.href} tone="light" size="lg">
              {FINAL_CTA.cta.label}
            </GradientButton>
          </div>
        </div>
      </div>
    </section>
  );
}
