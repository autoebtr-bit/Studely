"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Headphones,
  Layers,
  Loader2,
  PenLine,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { postAi } from "@/lib/api/ai";

type Job = "fiches" | "exercices" | "podcast";

interface GenerateBarProps {
  chapterId: string;
  /** Un podcast existe déjà : la route l'écrase, autant le dire. */
  hasPodcast: boolean;
}

const JOBS: {
  key: Job;
  label: string;
  path: string;
  icon: typeof Layers;
}[] = [
  { key: "fiches", label: "Des fiches", path: "/api/ai/flashcards", icon: Layers },
  { key: "exercices", label: "Des exercices", path: "/api/ai/exercises", icon: PenLine },
  { key: "podcast", label: "Un podcast", path: "/api/ai/podcast", icon: Headphones },
];

/**
 * Ce que l'IA peut produire à partir d'un chapitre.
 *
 * Cette barre résout trois culs-de-sac : les écrans des fiches, des exercices
 * et du podcast renvoyaient tous ici avec un « choisis un chapitre », et il n'y
 * avait aucun bouton une fois arrivé. L'élève tournait en rond.
 *
 * Le résultat est affiché plutôt que deviné : une génération réussie qui ne
 * change rien à l'écran courant donne l'impression que le bouton est cassé.
 */
export function GenerateBar({ chapterId, hasPodcast }: GenerateBarProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<Job | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(job: (typeof JOBS)[number]) {
    setBusy(job.key);
    setDone(null);
    setError(null);

    const result = await postAi<{ created?: number; title?: string }>(job.path, {
      chapterId,
    });

    setBusy(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setDone(
      job.key === "podcast"
        ? "Podcast prêt à écouter."
        : `${result.data.created ?? 0} ${job.key === "fiches" ? "fiches créées" : "exercices créés"}.`,
    );
    router.refresh();
  }

  return (
    <Card className="mb-7 p-4">
      <p className="text-sm font-semibold text-slate-900">
        Générer depuis ce cours
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        À partir des leçons de ce chapitre, sans rien ressaisir.
      </p>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {JOBS.map((job) => (
          <Button
            key={job.key}
            variant="outline"
            size="sm"
            onClick={() => run(job)}
            disabled={busy !== null}
          >
            {busy === job.key ? (
              <Loader2 className="animate-spin" />
            ) : (
              <job.icon />
            )}
            {job.key === "podcast" && hasPodcast ? "Refaire le podcast" : job.label}
          </Button>
        ))}
      </div>

      {done && (
        <p className="mt-3 flex items-start gap-2 text-sm text-emerald-700">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          {done}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 text-sm text-red-600"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </Card>
  );
}
