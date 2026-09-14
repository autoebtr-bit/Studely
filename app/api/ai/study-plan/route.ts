import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { EFFORT, MODEL } from "@/lib/ai/models";
import { SYSTEM_STUDY_PLAN } from "@/lib/ai/prompts";
import { studyPlanSchema } from "@/lib/ai/schemas";
import { generateStructured } from "@/lib/ai/generate";
import { guardAiRoute, logAiUsage } from "@/lib/ai/guard";
import { daysUntil } from "@/lib/utils/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Dix secondes par défaut en production : une génération d’Opus les dépasse.
export const maxDuration = 60;

const bodySchema = z.object({
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date au format AAAA-MM-JJ"),
  minutesPerDay: z.number().int().min(15).max(480).default(90),
  restDays: z
    .array(z.number().int().min(0).max(6))
    .max(6)
    .default([0])
    .describe("Jours de repos, 0 = dimanche"),
});

export async function POST(request: Request) {
  const guard = await guardAiRoute(request, bodySchema, "ai_generations");
  if (!guard.ok) return guard.response;

  const { body, supabase, userId } = guard;

  const remainingDays = daysUntil(body.examDate);
  if (remainingDays <= 0) {
    return Response.json(
      { error: "La date d'examen doit être dans le futur." },
      { status: 400 },
    );
  }

  // Le plan se construit sur la maîtrise réelle : les chapitres les plus
  // faibles doivent revenir le plus souvent.
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, progress_pct, subject_id")
    .order("progress_pct");

  if (!chapters?.length) {
    return Response.json(
      { error: "Ajoute au moins un chapitre avant de générer un planning." },
      { status: 400 },
    );
  }

  try {
    const { data, usage } = await generateStructured({
      system: SYSTEM_STUDY_PLAN,
      user:
        `Construis un programme de révision.\n\n` +
        `Jours restants avant l'examen : ${remainingDays}\n` +
        `Temps disponible par jour : ${body.minutesPerDay} minutes\n` +
        `Jours de repos (0 = dimanche) : ${body.restDays.join(", ") || "aucun"}\n\n` +
        `<chapitres>\n` +
        chapters
          .map((c) => `- ${c.id} — « ${c.title} » — maîtrise ${c.progress_pct}%`)
          .join("\n") +
        `\n</chapitres>\n\n` +
        `Utilise exactement les identifiants fournis comme chapterId.`,
      schema: studyPlanSchema,
      effort: EFFORT.studyPlan,
    });

    // Un seul plan actif à la fois.
    await supabase
      .from("study_plans")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    const { data: plan, error: planError } = await supabase
      .from("study_plans")
      .insert({
        user_id: userId,
        exam_date: body.examDate,
        params: {
          minutesPerDay: body.minutesPerDay,
          restDays: body.restDays,
        },
        is_active: true,
      })
      .select("id")
      .single();

    if (planError || !plan) {
      return Response.json(
        { error: "Le planning a été généré mais n'a pas pu être enregistré." },
        { status: 500 },
      );
    }

    const validChapterIds = new Set(chapters.map((c) => c.id));
    const today = new Date();

    const sessions = data.sessions
      // Le modèle peut inventer un identifiant : on écarte ces séances plutôt
      // que de laisser la contrainte de clé étrangère faire échouer l'insert.
      .filter((s) => validChapterIds.has(s.chapterId))
      .map((s) => {
        const date = new Date(today);
        date.setDate(date.getDate() + s.dayOffset);
        return {
          plan_id: plan.id,
          user_id: userId,
          chapter_id: s.chapterId,
          scheduled_on: date.toISOString().slice(0, 10),
          start_time: s.startTime,
          duration_min: s.durationMin,
          type: s.type,
          status: "a_faire" as const,
        };
      });

    if (sessions.length > 0) {
      await supabase.from("study_sessions").insert(sessions);
    }

    await logAiUsage(supabase, {
      userId,
      route: "/api/ai/study-plan",
      model: MODEL,
      ...usage,
    });

    return Response.json({
      planId: plan.id,
      created: sessions.length,
      skipped: data.sessions.length - sessions.length,
    });
  } catch (error) {
    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
}
