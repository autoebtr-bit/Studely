import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { ModuleDef } from "@/lib/modules/registry";
import { gradientClass } from "@/lib/modules/gradients";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

/**
 * Page d'attente d'un module non encore livré.
 *
 * On assume l'attente plutôt que de masquer le module : la grille reste
 * complète, et l'utilisateur comprend ce qui arrive et pourquoi.
 */
export function ComingSoon({ module }: { module: ModuleDef }) {
  const Icon = module.icon;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Retour au tableau de bord
      </Link>

      <Card className="overflow-hidden p-0">
        <div
          className={cn(
            "relative flex items-center gap-4 bg-gradient-to-br p-7 text-white",
            gradientClass(module.gradient),
          )}
        >
          <span className="module-orb" aria-hidden />
          <span className="relative grid size-14 shrink-0 place-items-center rounded-card bg-white/20 backdrop-blur-sm">
            <Icon className="size-7" aria-hidden />
          </span>
          <div className="relative min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {module.title}
              </h1>
              <Badge variant="onDark">
                <Sparkles className="size-3" aria-hidden />
                Bientôt
              </Badge>
            </div>
            <p className="mt-1 text-sm text-white/75">{module.subtitle}</p>
          </div>
        </div>

        <div className="p-7">
          <p className="text-slate-700">
            {module.soonNote ??
              "Ce module est en cours de construction et arrivera dans une prochaine version."}
          </p>

          <p className="mt-4 text-sm text-slate-600">
            En attendant, les modules de révision sont pleinement opérationnels :
            importe un cours, génère tes flashcards et lance une colle orale.
          </p>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/cours">
              <Button>Aller à mes cours</Button>
            </Link>
            <Link href="/flashcards">
              <Button variant="outline">Réviser mes flashcards</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
