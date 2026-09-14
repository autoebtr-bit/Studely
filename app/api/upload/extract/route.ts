import { z } from "zod";
import { anthropic, describeAiError } from "@/lib/ai/client";
import { EFFORT, MAX_TOKENS, MODEL } from "@/lib/ai/models";
import { SYSTEM_LESSON_EXTRACTION } from "@/lib/ai/prompts";
import { lessonExtractionSchema } from "@/lib/ai/schemas";
import { generateStructured } from "@/lib/ai/generate";
import { guardAiRoute, logAiUsage } from "@/lib/ai/guard";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * 60 s, comme les routes d'IA : c'est le plafond des offres d'hébergement
 * d'entrée de gamme, et demander davantage fait rejeter la valeur sans
 * avertissement plutôt que de l'accorder.
 *
 * C'est la route la plus exposée au dépassement — un cours de cinquante pages
 * y passe entier. Si le cas devient fréquent, la sortie n'est pas d'allonger le
 * délai mais de découper le document ou de passer par un traitement différé.
 */
export const maxDuration = 60;

/**
 * Deux entrées possibles, jamais les deux.
 *
 * **Le fichier ne transite pas par ici.** Le corps d'une requête est plafonné à
 * ~4,5 Mo en production ; un PDF de 20 Mo encodé en base64 en fait ~27. Le
 * navigateur téléverse donc vers le bucket `documents`, et cette route relit le
 * fichier depuis le stockage. Ce n'est pas un raffinement : c'est la seule
 * chaîne qui fonctionne.
 */
const bodySchema = z
  .object({
    subjectId: z.string().uuid(),
    /** Ligne `documents` déjà créée par le client, fichier déjà téléversé. */
    documentId: z.string().uuid().optional(),
    /** Texte collé directement dans l'écran, sans fichier. */
    text: z.string().min(40).max(200_000).optional(),
  })
  .refine((v) => Boolean(v.text) !== Boolean(v.documentId), {
    message: "Fournis soit un document téléversé, soit du texte, mais pas les deux.",
  });

type Client = Awaited<ReturnType<typeof createClient>>;

/** Types que le bucket accepte, et ce qu'on en fait côté modèle. */
const TEXT_TYPES = ["text/plain", "text/markdown"];
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(request: Request) {
  const guard = await guardAiRoute(request, bodySchema, "ai_generations");
  if (!guard.ok) return guard.response;

  const { body, supabase, userId } = guard;

  // La matière doit appartenir à l'utilisateur : la RLS le garantit, une
  // absence de résultat signifie donc « inexistante ou pas à toi ».
  const { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", body.subjectId)
    .single();

  if (!subject) {
    return Response.json({ error: "Matière introuvable." }, { status: 404 });
  }

  const documentId = body.documentId ?? null;

  try {
    const extraction = documentId
      ? await extractFromDocument(supabase, documentId)
      : await extractFromText(body.text!);

    // Le chapitre puis ses leçons, dans l'ordre du document.
    const { data: chapter, error: chapterError } = await supabase
      .from("chapters")
      .insert({
        subject_id: body.subjectId,
        user_id: userId,
        title: extraction.data.title,
      })
      .select("id")
      .single();

    if (chapterError || !chapter) {
      await markDocument(supabase, documentId, {
        status: "erreur",
        error_message: "Le chapitre n'a pas pu être créé.",
      });
      return Response.json(
        { error: "Le cours a été analysé mais le chapitre n'a pas pu être créé." },
        { status: 500 },
      );
    }

    await supabase.from("lessons").insert(
      extraction.data.lessons.map((lesson, i) => ({
        chapter_id: chapter.id,
        user_id: userId,
        title: lesson.title,
        content_md: lesson.contentMd,
        summary_md: lesson.summaryMd,
        reading_minutes: lesson.readingMinutes,
        position: i,
        source_type: extraction.sourceType,
        status: "pret" as const,
      })),
    );

    // Le texte retenu sert à rejouer une extraction sans reposer la question au
    // modèle, et à comprendre après coup ce qu'il a réellement lu.
    await markDocument(supabase, documentId, {
      status: "pret",
      extracted_text: extraction.data.lessons.map((l) => l.contentMd).join("\n\n"),
      error_message: null,
    });

    // Idempotent : le badge « premier import » ne se gagne qu'une fois.
    await supabase.rpc("award_xp", {
      p_kind: "first_import",
      p_scope: userId,
      p_context: {},
      p_ref_table: "chapters",
      p_ref_id: chapter.id,
    });

    await logAiUsage(supabase, {
      userId,
      route: "/api/upload/extract",
      model: MODEL,
      ...extraction.usage,
    });

    return Response.json({
      chapterId: chapter.id,
      title: extraction.data.title,
      lessons: extraction.data.lessons.length,
    });
  } catch (error) {
    const { status, message } = describeAiError(error);

    // Le message est repris tel quel dans la ligne `documents` : l'élève pourra
    // relancer l'analyse sans re-téléverser, et saura pourquoi elle a échoué.
    await markDocument(supabase, documentId, {
      status: "erreur",
      error_message: message.slice(0, 500),
    });

    return Response.json({ error: message }, { status });
  }
}

/* ---------------------------------------------------------- Document -- */

/**
 * Met à jour la ligne `documents`, si la requête en visait une.
 *
 * Volontairement silencieuse en cas d'échec : le suivi d'un document ne doit
 * pas faire échouer un import qui a par ailleurs réussi.
 */
async function markDocument(
  supabase: Client,
  documentId: string | null,
  patch: {
    status: "traitement" | "pret" | "erreur";
    extracted_text?: string;
    error_message?: string | null;
  },
): Promise<void> {
  if (!documentId) return;
  try {
    await supabase.from("documents").update(patch).eq("id", documentId);
  } catch {
    // Suivi best-effort.
  }
}

/**
 * Relit le fichier depuis le stockage et le donne au modèle sous la forme qui
 * lui convient.
 *
 * Le PDF part **tel quel**, en bloc `document` : le modèle lit la mise en page,
 * les colonnes et les formules, là où une extraction texte préalable les
 * détruirait. C'est aussi ce qui évite d'embarquer une bibliothèque de parsing.
 */
async function extractFromDocument(supabase: Client, documentId: string) {
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, mime_type, original_name")
    .eq("id", documentId)
    .single();

  // La RLS filtre déjà sur le propriétaire : pas de ligne = pas à toi.
  if (!doc) throw new Error("Document introuvable.");

  await markDocument(supabase, documentId, { status: "traitement" });

  const { data: blob, error } = await supabase.storage
    .from("documents")
    .download(doc.storage_path);

  if (error || !blob) {
    throw new Error("Le fichier n'a pas pu être relu depuis le stockage.");
  }

  const buffer = Buffer.from(await blob.arrayBuffer());

  // Un fichier texte n'a rien à faire dans l'entrée vision : le décoder coûte
  // dix fois moins cher et se lit mieux.
  if (TEXT_TYPES.includes(doc.mime_type)) {
    const text = buffer.toString("utf8").trim();
    if (text.length < 40) {
      throw new Error(
        `« ${doc.original_name} » ne contient pas assez de texte à analyser.`,
      );
    }
    return { ...(await extractFromText(text)), sourceType: "texte" as const };
  }

  if (doc.mime_type === "application/pdf") {
    const result = await extractFromBlock({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: buffer.toString("base64"),
      },
    });
    return { ...result, sourceType: "pdf" as const };
  }

  if (IMAGE_TYPES.includes(doc.mime_type)) {
    const result = await extractFromBlock({
      type: "image",
      source: {
        type: "base64",
        media_type: doc.mime_type as "image/png" | "image/jpeg" | "image/webp",
        data: buffer.toString("base64"),
      },
    });
    return { ...result, sourceType: "image" as const };
  }

  throw new Error(`Le format de « ${doc.original_name} » n'est pas pris en charge.`);
}

/* ------------------------------------------------------- Appels modèle -- */

async function extractFromText(text: string) {
  const result = await generateStructured({
    system: SYSTEM_LESSON_EXTRACTION,
    user: `Structure ce document en leçons.\n\n<document>\n${text}\n</document>`,
    schema: lessonExtractionSchema,
    effort: EFFORT.lessonSummary,
    maxTokens: MAX_TOKENS.standard,
  });
  return { ...result, sourceType: "texte" as const };
}

/**
 * PDF et photo de cahier : le texte n'existe pas encore, il faut passer par
 * l'entrée multimodale. `generateStructured` n'accepte que du texte, donc on
 * appelle directement l'API ici, avec le même schéma et le même prompt système
 * — le point de cache reste donc partagé avec la voie texte.
 */
async function extractFromBlock(
  block:
    | {
        type: "document";
        source: { type: "base64"; media_type: "application/pdf"; data: string };
      }
    | {
        type: "image";
        source: {
          type: "base64";
          media_type: "image/png" | "image/jpeg" | "image/webp";
          data: string;
        };
      },
) {
  const response = await anthropic().messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS.standard,
    system: [
      {
        type: "text",
        text: SYSTEM_LESSON_EXTRACTION,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          block,
          {
            type: "text",
            text: "Structure ce cours en leçons.",
          },
        ],
      },
    ],
    output_config: {
      effort: EFFORT.lessonSummary,
      format: zodOutputFormat(lessonExtractionSchema),
    },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("L'analyse de ce document a été refusée.");
  }
  if (!response.parsed_output) {
    throw new Error(
      "Le document n'a pas pu être exploité. S'il s'agit d'une photo, essaie un cliché plus net.",
    );
  }

  return {
    data: response.parsed_output,
    usage: {
      tokensIn: response.usage.input_tokens,
      tokensOut: response.usage.output_tokens,
      cacheRead: response.usage.cache_read_input_tokens ?? 0,
      cacheWrite: response.usage.cache_creation_input_tokens ?? 0,
    },
  };
}
