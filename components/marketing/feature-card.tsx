import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { FeatureItem } from "@/lib/marketing/content";
import { cn } from "@/lib/utils/cn";

/**
 * Carte de fonctionnalité.
 *
 * La carte entière est cliquable : l'intitulé de fin de carte reste visible
 * comme repère, mais on ne demande pas à l'utilisateur de viser un lien de
 * quelques pixels — surtout au doigt.
 */
export function FeatureCard({ feature }: { feature: FeatureItem }) {
  const Icon = feature.icon;

  return (
    <Link
      href={feature.href}
      className="hover-lift group block rounded-card border border-cream-200 bg-white p-8 shadow-sm hover:border-cream-300 hover:shadow-xl sm:p-10"
    >
      <span
        className={cn(
          "mb-6 grid size-14 place-items-center rounded-2xl text-white transition-transform duration-300 group-hover:scale-110",
          feature.iconClass,
        )}
      >
        <Icon className="size-7" strokeWidth={2} aria-hidden />
      </span>

      <h3 className="mb-3 text-xl font-bold text-slate-900 sm:text-2xl">
        {feature.title}
      </h3>

      <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
        {feature.description}
      </p>

      <span
        className={cn(
          "mt-6 inline-flex items-center gap-1.5 text-sm font-bold",
          feature.linkClass,
        )}
      >
        {feature.linkLabel}
        <ArrowRight
          className="size-4 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden
        />
      </span>
    </Link>
  );
}
