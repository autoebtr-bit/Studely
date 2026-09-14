import { Star } from "lucide-react";
import { SectionHeading } from "@/components/brand/section-heading";
import { SECTIONS, TESTIMONIALS, type Testimonial } from "@/lib/marketing/content";
import { cn } from "@/lib/utils/cn";

/** Une carte d'avis, réutilisable hors de cette section. */
export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <figure className="flex flex-col justify-between rounded-card border border-cream-200 bg-white p-8 shadow-sm">
      <div>
        <div className="mb-4 flex gap-0.5" aria-label="Note : 5 étoiles sur 5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="size-4 fill-amber-400 text-amber-400" aria-hidden />
          ))}
        </div>

        <blockquote className="text-sm italic leading-relaxed text-slate-700 sm:text-base">
          « {testimonial.quote} »
        </blockquote>
      </div>

      <figcaption className="mt-6 flex items-center gap-3 border-t border-cream-100 pt-6">
        <span
          aria-hidden
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white",
            testimonial.avatarClass,
          )}
        >
          {testimonial.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-slate-900">
            {testimonial.name}
          </span>
          <span className="block truncate text-xs text-slate-500">
            {testimonial.role}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export function TestimonialsSection() {
  return (
    <section id="temoignages" className="bg-cream-50 py-24">
      <div className="section-shell">
        <SectionHeading
          eyebrow={SECTIONS.temoignages.eyebrow}
          title={SECTIONS.temoignages.title}
          description={SECTIONS.temoignages.description}
          className="mb-16"
        />

        <div
          data-reveal-group
          className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8"
        >
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </div>
      </div>
    </section>
  );
}
