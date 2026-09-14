import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";
import { KHOLLES_OFFERTES } from "@/lib/billing/plans";
import { cn } from "@/lib/utils/cn";

interface FirstKholleProps {
  /** Khôlles blanches encore disponibles. */
  credits: number;
  className?: string;
}

/**
 * Bandeau d'accueil d'un compte neuf.
 *
 * `NextKholle` suppose une khôlle programmée, une matière et un programme de
 * colleur — un élève qui vient de s'inscrire n'a rien de tout ça. Plutôt que
 * d'afficher un bandeau vide ou des tirets, on lui dit ce qu'il peut faire
 * maintenant, et combien de khôlles il lui reste.
 *
 * C'est le premier écran après l'inscription : il décide de la suite.
 */
export function FirstKholle({ credits, className }: FirstKholleProps) {
  const epuise = credits === 0;

  return (
    <section
      className={cn(
        "gradient-sunset relative overflow-hidden rounded-card p-7 text-white shadow-lift sm:p-9",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-56 rounded-full bg-white/10 blur-2xl"
      />

      <span className="inline-flex items-center gap-2 rounded-pill bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider backdrop-blur-md">
        <Mic className="size-3.5" aria-hidden />
        {epuise ? "Essai terminé" : "Pour commencer"}
      </span>

      <h1 className="mt-4 max-w-xl text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
        {epuise
          ? "Tes khôlles blanches sont épuisées"
          : "Passe ta première khôlle blanche"}
      </h1>

      <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-white/90 sm:text-base">
        {epuise
          ? `Tu as utilisé tes ${KHOLLES_OFFERTES} khôlles d'essai. Le Pro te donne de quoi en passer plusieurs par semaine jusqu'aux oraux.`
          : "Entre le programme annoncé par ton colleur, et laisse-toi interroger à l'oral. Vingt minutes, puis une fiche notée sur 20 qui liste ce qui a manqué."}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Link
          href={epuise ? "/#tarifs" : "/kholle"}
          className="inline-flex h-11 items-center gap-2 rounded-pill bg-white px-6 text-sm font-bold text-slate-900 transition-transform hover:-translate-y-0.5"
        >
          {epuise ? "Voir l'offre Pro" : "Commencer une khôlle"}
          <ArrowRight className="size-4" aria-hidden />
        </Link>

        {!epuise && (
          <p className="text-sm font-medium text-white/90">
            {credits} khôlle{credits > 1 ? "s" : ""} disponible
            {credits > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </section>
  );
}
