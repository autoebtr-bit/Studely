import { SectionHeading } from "@/components/brand/section-heading";
import { FeatureCard } from "./feature-card";
import { FEATURES, SECTIONS } from "@/lib/marketing/content";

/** Les quatre piliers du produit. */
export function FeaturesSection() {
  return (
    <section
      id="fonctionnalites"
      className="relative overflow-hidden bg-cream-50 py-24"
    >
      <div
        aria-hidden
        className="ambient-glow right-0 top-1/3 size-96 max-w-[80vw] bg-accent-200/40"
      />
      <div
        aria-hidden
        className="ambient-glow bottom-10 left-0 size-96 max-w-[80vw] bg-brand-200/40"
      />

      <div className="section-shell">
        <SectionHeading
          eyebrow={SECTIONS.fonctionnalites.eyebrow}
          eyebrowTone="accent"
          title={SECTIONS.fonctionnalites.title}
          description={SECTIONS.fonctionnalites.description}
          width="wide"
          className="mb-16 sm:mb-20"
        />

        <div
          data-reveal-group
          className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8"
        >
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
