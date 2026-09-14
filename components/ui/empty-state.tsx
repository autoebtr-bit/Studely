import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Ce qui se passera ici, en une ou deux phrases. */
  description: string;
  action?: { label: string; href: string };
  /** Piste secondaire, quand il existe deux façons de démarrer. */
  secondary?: { label: string; href: string };
  className?: string;
}

/**
 * L'écran d'un compte qui vient d'être créé.
 *
 * C'est le premier contact réel avec le produit : à l'inscription, **tout** est
 * vide. Un écran vide qui ressemble à une panne fait partir l'élève avant sa
 * première khôlle, alors qu'il n'a rien fait de mal.
 *
 * D'où la règle tenue partout : ne jamais se contenter de « aucune donnée ».
 * On dit ce qui viendra s'afficher ici, et on propose l'action qui remplit
 * l'écran.
 *
 * Composant partagé pour que les dix écrans concernés ne divergent pas en dix
 * mises en page différentes.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn("p-8 text-center sm:p-10", className)}>
      <span
        aria-hidden
        className="gradient-sunset mx-auto grid size-12 place-items-center rounded-card text-white shadow-lift"
      >
        <Icon className="size-5" />
      </span>

      <h2 className="mt-4 text-base font-bold text-slate-900">{title}</h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
        {description}
      </p>

      {(action || secondary) && (
        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          {action && (
            <Link
              href={action.href}
              className={cn(buttonVariants({ size: "md" }), "w-full sm:w-auto")}
            >
              {action.label}
            </Link>
          )}
          {secondary && (
            <Link
              href={secondary.href}
              className={cn(
                buttonVariants({ variant: "outline", size: "md" }),
                "w-full sm:w-auto",
              )}
            >
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}
