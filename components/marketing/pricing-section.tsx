import { Check } from "lucide-react";
import { SectionHeading } from "@/components/brand/section-heading";
import { Eyebrow } from "@/components/brand/eyebrow";
import { GradientButton } from "@/components/ui/gradient-button";
import { PLANS, SECTIONS, type PricingPlan } from "@/lib/marketing/content";
import { cn } from "@/lib/utils/cn";

/** Une offre. Le plan mis en avant porte une bordure et un badge. */
export function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <article
      className={cn(
        "relative flex flex-col justify-between rounded-card p-8 sm:p-10",
        plan.featured
          ? "border-2 border-brand-500 bg-white shadow-2xl shadow-brand-500/15"
          : "hover-lift border border-cream-200 bg-cream-50 hover:shadow-card",
      )}
    >
      {plan.featured && (
        <span className="gradient-sunset absolute -top-3.5 right-8 rounded-pill px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-md">
          Recommandé
        </span>
      )}

      <div>
        <Eyebrow tone={plan.featured ? "brand" : "neutral"} className="mb-4">
          {plan.eyebrow}
        </Eyebrow>

        <h3 className="text-2xl font-bold text-slate-900">{plan.name}</h3>
        <p className="mt-2 text-sm text-slate-600">{plan.tagline}</p>

        <p className="mb-8 mt-6 flex flex-wrap items-baseline gap-1">
          <span className="text-5xl font-extrabold tracking-tight text-slate-950">
            {plan.price}
          </span>
          <span className="text-sm font-medium text-slate-500">{plan.period}</span>
        </p>

        <ul className="space-y-4 text-sm text-slate-700">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check
                aria-hidden
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  plan.featured ? "text-brand-500" : "text-emerald-500",
                )}
                strokeWidth={2.5}
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 pt-6">
        <GradientButton
          href={plan.ctaHref}
          tone={plan.featured ? "sunset" : "outline"}
          size="md"
          full
        >
          {plan.ctaLabel}
        </GradientButton>
      </div>
    </article>
  );
}

export function PricingSection() {
  return (
    <section id="tarifs" className="border-y border-cream-200/70 bg-white py-24">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={SECTIONS.tarifs.eyebrow}
          title={SECTIONS.tarifs.title}
          description={SECTIONS.tarifs.description}
          className="mb-16"
        />

        <div
          data-reveal-group
          className="grid grid-cols-1 items-stretch gap-8 md:grid-cols-2"
        >
          {PLANS.map((plan) => (
            <PricingCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
