import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { EFFORT, MODEL } from "@/lib/ai/models";
import { SYSTEM_PODCAST } from "@/lib/ai/prompts";
import { podcastScriptSchema } from "@/lib/ai/schemas";
import { generateStructured } from "@/lib/ai/generate";
import { guardAiRoute, logAiUsage } from "@/lib/ai/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Dix secondes par défaut en production : une génération d’Opus les dépasse.
export const maxDuration = 60;

const bodySchema = z.object({ chapterId: z.string().uuid() });

export async function POST(request: Request) {
  const guard = await guardAiRoute(request, bodySchema, "ai_generations");
  if (!guard.ok) return guard.response;

  const { body, supabase, userId } = guard;

  const { data: lessons } = await supabase
    .from("lessons")
    .select("title, content_md")
    .eq("chapter_id", body.chapterId)
    .order("position");

  if (!lessons?.length) {
    return Response.json(
      { error: "Ce chapitre ne contient aucune leçon." },
      { status: 404 },
    );
  }

  const courseText = lessons
    .map((l) => `## ${l.title}\n\n${l.content_md}`)
    .join("\n\n");

  try {
    const { data, usage } = await generateStructured({
      system: SYSTEM_PODCAST,
      user:
        `Rédige le script de révision audio de ce chapitre.\n\n` +
        `<cours>\n${courseText}\n</cours>`,
      schema: podcastScriptSchema,
      effort: EFFORT.podcast,
    });

    // Un seul podcast par chapitre : on remplace le précédent s'il existe.
    const { error } = await supabase.from("podcasts").upsert(
      {
        user_id: userId,
        chapter_id: body.chapterId,
        title: data.title,
        script: data.sections,
        duration_est_s: data.durationEstS,
        status: "pret" as const,
      },
      { onConflict: "chapter_id" },
    );

    if (error) {
      return Response.json(
        { error: "Le script a été généré mais n'a pas pu être enregistré." },
        { status: 500 },
      );
    }

    await logAiUsage(supabase, {
      userId,
      route: "/api/ai/podcast",
      model: MODEL,
      ...usage,
    });

    return Response.json(data);
  } catch (error) {
    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
}
