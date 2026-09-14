import { SectionHeading } from "@/components/brand/section-heading";
import { KholleProgress } from "@/components/kholle/kholle-progress";
import { DEMO_KHOLLE_HISTORY, SECTIONS } from "@/lib/marketing/content";

/**
 * La progression, illustrée.
 *
 * C'est le seul argument de la page qu'une fenêtre de discussion ne peut pas
 * reprendre : tenir le registre des oraux d'un élève sur des semaines.
 *
 * Le composant affiché est **exactement celui de l'application**, nourri par un
 * historique d'exemple. Illustrer avec une maquette dessinée pour la vitrine
 * finirait par promettre autre chose que ce que le produit fait ; ici, la
 * divergence est impossible.
 *
 * La mention « données d'exemple » reste visible : un visiteur doit savoir
 * qu'il regarde une illustration, pas la copie d'écran d'un compte réel.
 */
export function ProgressSection() {
  return (
    <section
      id="progression"
      className="border-y border-cream-200/70 bg-white py-24"
    >
      <div className="section-shell">
        <SectionHeading
          eyebrow={SECTIONS.progression.eyebrow}
          title={SECTIONS.progression.title}
          description={SECTIONS.progression.description}
          width="wide"
          className="mb-12"
        />

        <div data-reveal className="mx-auto max-w-3xl">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
            Exemple — données fictives
          </p>

          {/* `showCta` désactivé : la vitrine illustre, elle ne pilote pas. */}
          <KholleProgress history={DEMO_KHOLLE_HISTORY} showCta={false} />

          <p className="mt-4 text-center text-sm text-slate-500">
            Sur ton compte, cette courbe part vide et se remplit à chaque khôlle.
          </p>
        </div>
      </div>
    </section>
  );
}
