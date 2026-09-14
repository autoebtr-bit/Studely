import { SectionHeading } from "@/components/brand/section-heading";
import { SECTIONS, STEPS } from "@/lib/marketing/content";

/** Le parcours de prise en main, en trois étapes. */
export function HowItWorksSection() {
  return (
    <section
      id="comment-ca-marche"
      className="border-y border-cream-200/70 bg-white py-24"
    >
      <div className="section-shell">
        <SectionHeading
          eyebrow={SECTIONS.etapes.eyebrow}
          title={SECTIONS.etapes.title}
          description={SECTIONS.etapes.description}
          className="mb-16 sm:mb-20"
        />

        <ol
          data-reveal-group
          className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8"
        >
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="hover-lift rounded-card border border-cream-200 bg-cream-50 p-8 hover:shadow-card"
            >
              <span
                aria-hidden
                className="gradient-sunset-text mb-4 block text-5xl font-extrabold opacity-90"
              >
                {step.number}
              </span>
              <h3 className="mb-2 text-xl font-bold text-slate-900">{step.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
