import "server-only";

import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;

/**
 * Client Anthropic, instancié une seule fois par processus.
 *
 * La clé est lue depuis l'environnement serveur. Elle ne doit jamais être
 * préfixée `NEXT_PUBLIC_` : ce fichier importe `server-only`, donc toute
 * tentative de l'inclure dans un composant client casse le build — c'est
 * volontaire.
 */
export function anthropic(): Anthropic {
  if (cached) return cached;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante. Renseigne-la dans .env.local (voir .env.example).",
    );
  }

  cached = new Anthropic();
  return cached;
}

/** Message d'erreur lisible par un élève, à partir d'une erreur du SDK. */
export function describeAiError(error: unknown): {
  status: number;
  message: string;
} {
  if (error instanceof Anthropic.RateLimitError) {
    return {
      status: 429,
      message:
        "Le service est très sollicité en ce moment. Réessaie dans quelques instants.",
    };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return {
      status: 500,
      message: "Configuration du service IA invalide. L'équipe a été prévenue.",
    };
  }
  if (error instanceof Anthropic.BadRequestError) {
    // Le solde prépayé épuisé arrive ici, en 400, au milieu des vraies requêtes
    // malformées. Sans ce test, un abonné payant lit « reformule ta question »
    // et reformule dans le vide, alors que le problème est entièrement le
    // nôtre. Le statut passe à 503 : c'est une indisponibilité, pas sa faute.
    if (/credit balance/i.test(String((error as { message?: unknown }).message))) {
      return {
        status: 503,
        message:
          "Le service est momentanément indisponible pour une raison technique " +
          "de notre côté. Réessaie dans quelques minutes.",
      };
    }
    return {
      status: 400,
      message: "La demande n'a pas pu être traitée. Reformule ta question.",
    };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return {
      status: 503,
      message: "Impossible de joindre le service IA. Vérifie ta connexion.",
    };
  }
  if (error instanceof Anthropic.APIError) {
    return {
      status: error.status ?? 500,
      message: "Le service IA a rencontré un problème. Réessaie dans un instant.",
    };
  }
  return {
    status: 500,
    message: "Une erreur inattendue est survenue.",
  };
}
