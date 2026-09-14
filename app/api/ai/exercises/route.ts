import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { EFFORT, MODEL } from "@/lib/ai/models";
import { SYSTEM_EXERCISES } from "@/lib/ai/prompts";
import { exerciseSetSchema } from "@/lib/ai/schemas";
import { generateStructured } from "@/lib/ai/generate";
import { guardAiRoute, logAiUsage } from "@/lib/ai/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Dix secondes par défaut en production : une génération d’Opus les dépasse.
export const maxDuration = 60;

/**
 * Génération d'exercices à partir d'un chapitre.
 *
 * Cette route manquait : `exerciseSetSchema` et `SYSTEM_EXERCISES` étaient
 * écrits depuis le début et n'étaient appelés nulle part, si bien que l'écran
 * des exercices ne pouvait jamais se remplir — seule la correction existait.
 *
 * Calquée sur `flashcards` : même garde, même quota, même lecture du cours.
 */
const bodySchema = z.object({
  chapterId: z.string().uuid(),
  count: z.number().int().min(1).max(10).default(4),
});

export async function POST(request: Request) {
  const guard = await guardAiRoute(request, bodySchema, "ai_generations");
  if (!guard.ok) return guard.response;

  const { body, supabase, userId } = guard;

  // La RLS garantit déjà qu'on ne lit que les chapitres de l'utilisateur ;
  // un chapitre inexistant OU appartenant à autrui donne le même résultat vide.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("title, content_md")
    .eq("chapter_id", body.chapterId)
    .order("position");

  if (!lessons?.length) {
    return Response.json(
      { error: "Ce chapitre ne contient aucune leçon à exploiter." },
      { status: 404 },
    );
  }

  const courseText = lessons
    .map((l) => `## ${l.title}\n\n${l.content_md}`)
    .join("\n\n");

  try {
    const { data, usage } = await generateStructured({
      system: SYSTEM_EXERCISES,
      user:
        `Conçois ${body.count} exercices d'entraînement à partir de ce cours.\n\n` +
        `<cours>\n${courseText}\n</cours>`,
      schema: exerciseSetSchema,
      effort: EFFORT.exercises,
    });

    const { data: inserted, error } = await supabase
      .from("exercises")
      .insert(
        data.exercises.map((exercise) => ({
          user_id: userId,
          chapter_id: body.chapterId,
          prompt: exercise.prompt,
          solution: exercise.solution,
          rubric: exercise.rubric,
          difficulty: exercise.difficulty,
          minutes: exercise.minutes,
        })),
      )
      .select("id");

    if (error) {
      return Response.json(
        {
          error:
            "Les exercices ont été générés mais n'ont pas pu être enregistrés.",
        },
        { status: 500 },
      );
    }

    await logAiUsage(supabase, {
      userId,
      route: "/api/ai/exercises",
      model: MODEL,
      ...usage,
    });

    return Response.json({ created: inserted?.length ?? 0 });
  } catch (error) {
    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
}
