import { z } from "zod";
import { anthropic, describeAiError } from "@/lib/ai/client";
import { EFFORT, MAX_TOKENS, MODEL } from "@/lib/ai/models";
import { SYSTEM_CHAT } from "@/lib/ai/prompts";
import { guardAiRoute, logAiUsage } from "@/lib/ai/guard";

// Le SDK Anthropic a besoin du runtime Node, et la réponse est un flux :
// elle ne peut donc pas être mise en cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Dix secondes par défaut en production : une génération d’Opus les dépasse.
export const maxDuration = 60;

const bodySchema = z.object({
  message: z.string().min(1).max(4000),
  chapterId: z.string().uuid().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .max(40)
    .default([]),
});

/**
 * Bornes de contexte.
 *
 * Le schéma accepte 40 messages de 8 000 caractères : renvoyés tels quels à
 * chaque tour, ils dépassent 0,40 $ d'entrée pour UNE question. Or une
 * conversation de révision se comprend avec ses derniers échanges.
 *
 * Le cours, lui, n'est pas tronqué : c'est ce qui rend la réponse spécifique à
 * l'élève, et le tronquer répondrait à côté.
 */
const HISTORY_TURNS = 10;
const HISTORY_CHARS = 2_000;

function tail(text: string, max: number): string {
  return text.length <= max ? text : `…${text.slice(-max)}`;
}

export async function POST(request: Request) {
  const guard = await guardAiRoute(request, bodySchema, "ai_messages");
  if (!guard.ok) return guard.response;

  const { body, supabase, userId } = guard;

  // Contexte du chapitre : c'est ce qui rend la réponse spécifique à l'élève.
  let chapterContext = "";
  if (body.chapterId) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("title, content_md")
      .eq("chapter_id", body.chapterId)
      .order("position");

    if (lessons?.length) {
      chapterContext = lessons
        .map((l) => `## ${l.title}\n\n${l.content_md}`)
        .join("\n\n");
    }
  }

  const userContent = chapterContext
    ? `Voici le cours de l'élève :\n\n<cours>\n${chapterContext}\n</cours>\n\n` +
      `Sa question : ${body.message}`
    : body.message;

  try {
    const stream = anthropic().messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS.streaming,
      output_config: { effort: EFFORT.chat },
      system: [
        { type: "text", text: SYSTEM_CHAT, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        ...body.history
          .slice(-HISTORY_TURNS)
          .map((m) => ({ role: m.role, content: tail(m.content, HISTORY_CHARS) })),
        { role: "user" as const, content: userContent },
      ],
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          const final = await stream.finalMessage();

          if (final.stop_reason === "refusal") {
            controller.enqueue(
              encoder.encode(
                "\n\n[Je ne peux pas répondre à cette demande. Reformule-la autrement.]",
              ),
            );
          }

          await logAiUsage(supabase, {
            userId,
            route: "/api/ai/chat",
            model: MODEL,
            tokensIn: final.usage.input_tokens,
            tokensOut: final.usage.output_tokens,
            cacheRead: final.usage.cache_read_input_tokens ?? 0,
            cacheWrite: final.usage.cache_creation_input_tokens ?? 0,
          });
        } catch {
          controller.enqueue(
            encoder.encode(
              "\n\n[La réponse a été interrompue. Réessaie dans un instant.]",
            ),
          );
        } finally {
          controller.close();
        }
      },
      cancel() {
        // L'élève a quitté la page : on coupe la génération pour ne pas la payer.
        stream.abort();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
}
