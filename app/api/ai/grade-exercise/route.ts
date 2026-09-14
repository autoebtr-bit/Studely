import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { EFFORT, MODEL } from "@/lib/ai/models";
import { SYSTEM_GRADE_EXERCISE } from "@/lib/ai/prompts";
import { exerciseGradeSchema } from "@/lib/ai/schemas";
import { generateStructured } from "@/lib/ai/generate";
import { guardAiRoute, logAiUsage } from "@/lib/ai/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Dix secondes par défaut en production : une génération d’Opus les dépasse.
export const maxDuration = 60;

const bodySchema = z.object({
  exerciseId: z.string().uuid(),
  answer: z.string().min(1).max(20_000),
});

export async function POST(request: Request) {
  const guard = await guardAiRoute(request, bodySchema, "ai_generations");
  if (!guard.ok) return guard.response;

  const { body, supabase, userId } = guard;

  const { data: exercise } = await supabase
    .from("exercises")
    .select("prompt, solution, rubric, difficulty")
    .eq("id", body.exerciseId)
    .single();

  if (!exercise) {
    return Response.json({ error: "Exercice introuvable." }, { status: 404 });
  }

  try {
    const { data, usage } = await generateStructured({
      system: SYSTEM_GRADE_EXERCISE,
      user:
        `Corrige cette copie.\n\n` +
        `<enonce>\n${exercise.prompt}\n</enonce>\n\n` +
        `<correction_attendue>\n${exercise.solution ?? "Non fournie."}\n</correction_attendue>\n\n` +
        `<bareme>\n${JSON.stringify(exercise.rubric)}\n</bareme>\n\n` +
        `<copie_eleve>\n${body.answer}\n</copie_eleve>`,
      schema: exerciseGradeSchema,
      effort: EFFORT.gradeExercise,
    });

    await supabase.from("exercise_attempts").insert({
      exercise_id: body.exerciseId,
      user_id: userId,
      answer: body.answer,
      score: data.score,
      feedback: data,
    });

    // L'XP est créditée côté base : le client ne choisit jamais le montant.
    await supabase.rpc("award_xp", {
      p_kind: data.score >= 50 ? "exercise_correct" : "exercise_attempted",
      p_scope: body.exerciseId,
      p_context: {},
      p_ref_table: "exercises",
      p_ref_id: body.exerciseId,
    });

    await logAiUsage(supabase, {
      userId,
      route: "/api/ai/grade-exercise",
      model: MODEL,
      ...usage,
    });

    return Response.json(data);
  } catch (error) {
    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
}
