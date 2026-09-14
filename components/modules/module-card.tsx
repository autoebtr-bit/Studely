import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ModuleDef } from "@/lib/modules/registry";
import { gradientClass } from "@/lib/modules/gradients";

interface ModuleCardProps {
  module: ModuleDef;
  /** Variante haute et pleine largeur, pour le module mis en avant. */
  featured?: boolean;
  className?: string;
}

/**
 * Pavé de module de la grille (capture 3) : tuile d'icône à gauche,
 * titre + sous-titre, orbe translucide à droite.
 *
 * Un module « soon » reste cliquable et mène à sa page d'attente — on ne
 * laisse jamais un élément visuellement actif mais inerte.
 */
export function ModuleCard({ module, featured = false, className }: ModuleCardProps) {
  const Icon = module.icon;
  const isSoon = module.status === "soon";

  return (
    <Link
      href={`/${module.slug}`}
      aria-label={`${module.title} — ${module.subtitle}${isSoon ? " (bientôt disponible)" : ""}`}
      className={cn(
        "group relative flex items-center gap-3.5 overflow-hidden rounded-card",
        "bg-gradient-to-br p-4 text-white shadow-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lift",
        gradientClass(module.gradient),
        featured && "gap-4 p-5",
        // Un module non livré est estompé, mais son texte doit rester lisible :
        // le cadenas suffit à signaler l'indisponibilité.
        isSoon && "opacity-90 saturate-[0.9] hover:opacity-100 hover:saturate-100",
        className,
      )}
    >
      <span className="module-orb" aria-hidden />

      <span
        className={cn(
          "relative grid shrink-0 place-items-center rounded-tile bg-white/20 backdrop-blur-sm",
          featured ? "size-11" : "size-10",
        )}
      >
        <Icon className={featured ? "size-6" : "size-5"} strokeWidth={2} aria-hidden />
      </span>

      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "block truncate font-semibold tracking-tight",
              featured ? "text-lg" : "text-[15px]",
            )}
          >
            {module.title}
          </span>
          {isSoon && <Lock className="size-3 shrink-0 opacity-80" aria-hidden />}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-white/85">
          {module.subtitle}
        </span>
      </span>

      {featured && (
        <span
          className="relative grid size-8 shrink-0 place-items-center rounded-full bg-white/15
                     transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor">
            <path
              d="m9 18 6-6-6-6"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </Link>
  );
}
