import { z } from "zod";
import { describeAiError } from "@/lib/ai/client";
import { EFFORT, MODEL } from "@/lib/ai/models";
import { SYSTEM_FLASHCARDS } from "@/lib/ai/prompts";
import { flashcardSetSchema } from "@/lib/ai/schemas";
import { generateStructured } from "@/lib/ai/generate";
import { guardAiRoute, logAiUsage } from "@/lib/ai/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Dix secondes par défaut en production : une génération d’Opus les dépasse.
export const maxDuration = 60;

const bodySchema = z.object({
  chapterId: z.string().uuid(),
  count: z.number().int().min(3).max(30).default(12),
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
      system: SYSTEM_FLASHCARDS,
      user:
        `Génère environ ${body.count} cartes de révision à partir de ce cours.\n\n` +
        `<cours>\n${courseText}\n</cours>`,
      schema: flashcardSetSchema,
      effort: EFFORT.flashcards,
    });

    const { data: inserted, error } = await supabase
      .from("flashcards")
      .insert(
        data.cards.map((card) => ({
          user_id: userId,
          chapter_id: body.chapterId,
          front: card.front,
          back: card.back,
        })),
      )
      .select("id");

    if (error) {
      return Response.json(
        { error: "Les cartes ont été générées mais n'ont pas pu être enregistrées." },
        { status: 500 },
      );
    }

    // État de répétition espacée initial : les cartes sont dues immédiatement.
    if (inserted?.length) {
      await supabase.from("flashcard_states").insert(
        inserted.map((row) => ({
          card_id: row.id,
          user_id: userId,
          ease: 2.5,
          interval_days: 0,
          reps: 0,
          lapses: 0,
          last_review_at: null,
        })),
      );
    }

    await logAiUsage(supabase, {
      userId,
      route: "/api/ai/flashcards",
      model: MODEL,
      ...usage,
    });

    return Response.json({ created: inserted?.length ?? 0, cards: data.cards });
  } catch (error) {
    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
}
