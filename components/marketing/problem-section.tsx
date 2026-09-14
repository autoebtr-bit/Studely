import { SectionHeading } from "@/components/brand/section-heading";
import { PROBLEMS, SECTIONS } from "@/lib/marketing/content";
import { cn } from "@/lib/utils/cn";

/** Le constat : pourquoi les méthodes classiques échouent. */
export function ProblemSection() {
  return (
    <section className="border-y border-cream-200/60 bg-white py-20">
      <div className="section-shell">
        <SectionHeading
          eyebrow={SECTIONS.probleme.eyebrow}
          title={SECTIONS.probleme.title}
          description={SECTIONS.probleme.description}
          className="mb-16"
        />

        <div
          data-reveal-group
          className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8"
        >
          {PROBLEMS.map((problem) => (
            <article
              key={problem.title}
              className="hover-lift rounded-card border border-cream-200/80 bg-cream-50 p-8 hover:shadow-card"
            >
              <span
                aria-hidden
                className={cn(
                  "mb-6 grid size-12 place-items-center rounded-2xl text-2xl",
                  problem.tint,
                )}
              >
                {problem.emoji}
              </span>
              <h3 className="mb-3 text-xl font-bold text-slate-900">{problem.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">
                {problem.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
