import { SectionHeading } from "@/components/brand/section-heading";
import { DIFFERENCE_POINTS, SECTIONS } from "@/lib/marketing/content";

/**
 * Ce qui nous distingue d'un assistant généraliste.
 *
 * Placée juste après « Le constat » : le lecteur vient d'admettre qu'il ne peut
 * pas s'entraîner seul, et sa pensée suivante est « oui mais je peux demander
 * ça à une IA ». C'est là qu'il faut répondre, pas trois écrans plus bas.
 *
 * Mise en page volontairement différente des sections voisines : la page
 * enchaîne déjà trois grilles de cartes. Ici, une liste dont chaque rangée est
 * ancrée par son chiffre — c'est le chiffre qui porte l'argument, le texte ne
 * fait que l'expliquer.
 *
 * Aucun concurrent n'est nommé : c'est la précision qui fait le contraste.
 */
export function DifferenceSection() {
  return (
    <section
      id="ce-qui-change"
      className="relative overflow-hidden bg-cream-50 py-24"
    >
      <div
        aria-hidden
        className="ambient-glow -left-20 top-1/4 size-80 max-w-[70vw] bg-brand-200/35"
      />

      <div className="section-shell">
        <SectionHeading
          eyebrow={SECTIONS.difference.eyebrow}
          title={SECTIONS.difference.title}
          description={SECTIONS.difference.description}
          width="wide"
          className="mb-14"
        />

        <ol data-reveal-group className="mx-auto max-w-3xl">
          {DIFFERENCE_POINTS.map((point) => (
            <li
              key={point.title}
              className="flex flex-col gap-x-8 gap-y-3 border-t border-cream-200 py-8 first:border-t-0 first:pt-0 sm:flex-row"
            >
              {/* Le chiffre, ancre visuelle de la rangée. */}
              <p className="flex shrink-0 items-baseline gap-2 sm:w-36 sm:flex-col sm:items-start sm:gap-0">
                <span className="gradient-sunset-text text-4xl font-extrabold leading-none tracking-tight tabular-nums sm:text-5xl">
                  {point.figure}
                </span>
                <span className="text-xs font-bold uppercase leading-tight tracking-wider text-slate-500">
                  {point.unit}
                </span>
              </p>

              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {point.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
