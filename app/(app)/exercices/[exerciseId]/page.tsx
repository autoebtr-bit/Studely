import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readExercise } from "@/lib/data/study";
import { readChapter } from "@/lib/data/courses";
import { ExerciseWorkspace } from "./exercise-workspace";

interface PageProps {
  params: { exerciseId: string };
}

// Les exercices appartiennent à chaque élève : aucune liste n'est connue à la
// compilation.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const exercise = await readExercise(params.exerciseId);
  return { title: exercise ? "Exercice" : "Exercice introuvable" };
}

export default async function ExercisePage({ params }: PageProps) {
  const exercise = await readExercise(params.exerciseId);
  if (!exercise) notFound();

  const found = await readChapter(exercise.chapterId);

  return (
    <ExerciseWorkspace
      exerciseId={exercise.id}
      prompt={exercise.prompt}
      difficulty={exercise.difficulty}
      minutes={exercise.minutes}
      chapterTitle={found?.chapter.title ?? ""}
    />
  );
}
