import Link from "next/link";
import { ArrowRight, Mic } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface NextKholleProps {
  /** Matière de la prochaine khôlle. */
  subject: string;
  /** Jour et heure, en clair. */
  when: string;
  /** Jours restants. 0 = aujourd'hui. */
  daysLeft: number;
  /** Programme annoncé par le colleur. */
  programme: string;
  /** Part des questions de cours maîtrisées, de 0 à 100. */
  readiness: number;
  masteredCount: number;
  totalCount: number;
}

/**
 * Bandeau d'accueil.
 *
 * Le tableau de bord n'est plus un lanceur de vingt tuiles mais un poste de
 * travail : une échéance, un état de préparation, une action. Le reste de
 * l'application reste accessible mais ne s'impose plus.
 */
export function NextKholle({
  subject,
  when,
  daysLeft,
  programme,
  readiness,
  masteredCount,
  totalCount,
}: NextKholleProps) {
  const urgent = daysLeft <= 1;

  return (
    <section className="relative overflow-hidden rounded-card border border-cream-200 bg-white p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full gradient-orb opacity-20 blur-2xl"
      />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600">
            <Mic className="size-3" aria-hidden />
            Prochaine khôlle
          </span>

          <span
            className={cn(
              "rounded-pill px-3 py-1 text-xs font-bold tabular-nums",
              urgent ? "bg-red-50 text-red-700" : "bg-cream-100 text-slate-600",
            )}
          >
            {daysLeft === 0 ? "Aujourd'hui" : daysLeft === 1 ? "Demain" : `J−${daysLeft}`}
          </span>
        </div>

        <h1 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-3xl">
          {subject} · {when}
        </h1>

        <p className="mt-2 max-w-xl text-sm text-slate-600">{programme}</p>

        {/* État de préparation, exprimé en questions de cours plutôt qu'en XP :
            c'est la seule mesure qui parle à quelqu'un qui passe une khôlle. */}
        <div className="mt-6 max-w-md">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-slate-900">
              Prêt à {Math.round(readiness)} %
            </span>
            <span className="tabular-nums text-slate-500">
              {masteredCount} questions de cours sur {totalCount}
            </span>
          </div>

          <div className="mt-2 h-2.5 overflow-hidden rounded-pill bg-cream-200">
            <div
              className="h-full rounded-pill gradient-sunset transition-[width] duration-700"
              style={{ width: `${Math.min(100, Math.max(0, readiness))}%` }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href="/kholle"
            className="cta-gradient gradient-sunset-pan inline-flex h-12 items-center gap-2 rounded-pill px-7 text-sm font-bold text-white shadow-lift hover:shadow-glow"
          >
            Passer une khôlle blanche
            <ArrowRight className="size-4" aria-hidden />
          </Link>

          <Link
            href="/flashcards"
            className="inline-flex h-12 items-center gap-2 rounded-pill border border-cream-300 bg-white px-6 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-300 hover:text-brand-600"
          >
            Réviser les questions de cours
          </Link>
        </div>
      </div>
    </section>
  );
}
