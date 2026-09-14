import "server-only";

import type { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./client";
import { EFFORT, MAX_TOKENS, MODEL, type Effort } from "./models";

export interface GenerateOptions<T extends z.ZodTypeAny> {
  /** Prompt système stable, issu de `lib/ai/prompts.ts`. */
  system: string;
  /** Contenu variable : cours de l'élève, consigne, contexte. */
  user: string;
  schema: T;
  effort?: Effort;
  maxTokens?: number;
}

export interface GenerateResult<T> {
  data: T;
  usage: {
    tokensIn: number;
    tokensOut: number;
    cacheRead: number;
    cacheWrite: number;
  };
}

/**
 * Génération structurée : le modèle est contraint de répondre au format du
 * schéma Zod fourni, et la réponse est validée avant d'être renvoyée.
 *
 * Le prompt système porte le point de cache — il est identique d'un appel à
 * l'autre pour un même usage, donc facturé une fois puis relu à coût réduit.
 * Le contenu volatile est placé APRÈS, dans le message utilisateur.
 */
export async function generateStructured<T extends z.ZodTypeAny>({
  system,
  user,
  schema,
  effort = EFFORT.chat,
  maxTokens = MAX_TOKENS.standard,
}: GenerateOptions<T>): Promise<GenerateResult<z.infer<T>>> {
  const client = anthropic();

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: maxTokens,
    system: [
      { type: "text", text: system, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: user }],
    output_config: {
      effort,
      format: zodOutputFormat(schema),
    },
  });

  // Un refus de sécurité renvoie un HTTP 200 : il faut le tester explicitement
  // avant de lire le contenu.
  if (response.stop_reason === "refusal") {
    throw new Error(
      "La génération a été refusée pour des raisons de sécurité. " +
        "Vérifie le contenu du document envoyé.",
    );
  }

  // `parsed_output` vaut null si la validation a échoué.
  if (!response.parsed_output) {
    throw new Error(
      "La réponse du modèle ne correspond pas au format attendu. Réessaie.",
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
