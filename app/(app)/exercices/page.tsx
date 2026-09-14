import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock, PenLine } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { readExercises } from "@/lib/data/study";
import { readSubjects } from "@/lib/data/courses";

export const metadata: Metadata = { title: "Exercices" };

const DIFFICULTY_VARIANT: Record<
  "facile" | "moyen" | "difficile",
  "success" | "warning" | "danger"
> = {
  facile: "success",
  moyen: "warning",
  difficile: "danger",
};

export default async function ExercicesPage() {
  const [exercises, subjects] = await Promise.all([
    readExercises(),
    readSubjects(),
  ]);

  const chapters = subjects.flatMap((s) =>
    s.chapters.map((c) => ({ ...c, subjectName: s.name })),
  );
  const done = exercises.filter((e) => e.solved).length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Exos au tableau"
        description="Entraîne-toi, puis fais corriger ta réponse point par point."
        actions={
          exercises.length > 0 ? (
            <Badge variant="neutral">
              {done} / {exercises.length} faits
            </Badge>
          ) : undefined
        }
      />

      {exercises.length === 0 && (
        <EmptyState
          icon={PenLine}
          title="Aucun exercice pour l'instant"
          description="Les exercices se génèrent à partir de tes chapitres. Tu les résous à voix haute, comme au tableau, et la correction porte autant sur le raisonnement que sur le résultat."
          action={{ label: "Voir mes cours", href: "/cours" }}
          secondary={{ label: "Importer un cours", href: "/importer" }}
        />
      )}

      <div className="space-y-3">
        {exercises.map((exercise) => {
          const chapter = chapters.find((c) => c.id === exercise.chapterId);
          const subject = chapter ? { name: chapter.subjectName } : undefined;

          return (
            <Card key={exercise.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={DIFFICULTY_VARIANT[exercise.difficulty]}>
                  {exercise.difficulty}
                </Badge>
                <span className="text-xs text-slate-500">
                  {subject?.name} · {chapter?.title}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="size-3" aria-hidden />
                  {exercise.minutes} min
                </span>
                {exercise.solved && (
                  <Badge variant="success" className="ml-auto">
                    <Check className="size-3" aria-hidden />
                    réussi
                  </Badge>
                )}
              </div>

              <p className="mt-3 text-sm leading-relaxed text-slate-800">
                {exercise.prompt}
              </p>

              <div className="mt-4">
                <Link href={`/exercices/${exercise.id}`}>
                  <Button size="sm" variant={exercise.solved ? "outline" : "primary"}>
                    <PenLine />
                    {exercise.solved ? "Refaire" : "Commencer"}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
