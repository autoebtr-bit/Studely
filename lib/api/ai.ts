/**
 * Appels aux routes d'IA depuis les composants client.
 *
 * **Pas de `server-only` ici** : ce module est fait pour être importé par des
 * composants client. Il ne touche aucune clé — les routes s'en chargent.
 *
 * Pourquoi un module partagé plutôt qu'un `fetch` par écran : toutes nos routes
 * répondent en JSON `{ error: "…" }` avec un message déjà rédigé pour un élève,
 * et ces messages portent la décision commerciale du produit — « tu as atteint
 * ta limite quotidienne », « cette fonctionnalité fait partie de l'offre Pro »,
 * « ton essai gratuit est terminé ». Les remplacer par un « une erreur est
 * survenue » générique ferait disparaître le seul moment où l'abonnement se
 * décide. Écrit une fois, ce cas ne peut plus être oublié écran par écran.
 */

export type AiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

/** Message de dernier recours, quand la réponse ne porte aucune explication. */
const FALLBACK = "Le service n'a pas répondu. Réessaie dans un instant.";

/**
 * La réponse est-elle du type annoncé ?
 *
 * Garde-fou contre une page HTML reçue à la place de la charge attendue —
 * typiquement une redirection vers l'écran de connexion, que `fetch` suit en
 * silence et qui arrive donc en 200. Sans ce contrôle, le chat afficherait le
 * code source de la page de connexion comme si Kollia l'avait dicté.
 */
function isType(res: Response, expected: string): boolean {
  return (res.headers.get("Content-Type") ?? "").includes(expected);
}

/**
 * Lit le message d'erreur d'une réponse.
 *
 * Toujours tolérant : une réponse vide, tronquée ou non-JSON ne doit pas
 * produire une exception qui masquerait le vrai statut HTTP.
 */
async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown } | null;
    if (body && typeof body.error === "string" && body.error.trim() !== "") {
      return body.error;
    }
  } catch {
    // Corps illisible : on retombe sur le message générique.
  }
  return FALLBACK;
}

/**
 * POST vers une route d'IA, avec le message du serveur préservé tel quel.
 *
 * Aucune validation du corps de la réponse côté client : le schéma Zod a déjà
 * contraint la génération **et** validé la sortie côté serveur. Revalider ici
 * embarquerait les schémas dans le bundle sans rien garantir de plus.
 */
export async function postAi<T>(
  path: string,
  body: unknown,
  options?: { signal?: AbortSignal },
): Promise<AiResult<T>> {
  let res: Response;

  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  } catch {
    // Coupure réseau, navigation, onglet fermé : jamais un problème de quota,
    // donc il ne faut surtout pas laisser croire à une limite atteinte.
    return {
      ok: false,
      status: 0,
      error: "Connexion interrompue. Vérifie ton réseau et réessaie.",
    };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: await readError(res) };
  }

  if (!isType(res, "application/json")) {
    return { ok: false, status: res.status, error: FALLBACK };
  }

  try {
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false, status: res.status, error: FALLBACK };
  }
}

/**
 * POST vers une route qui répond en flux de texte brut — le chat.
 *
 * Ce n'est pas du SSE : la route écrit des fragments de texte sans encadrement,
 * il n'y a donc ni `data:` à retirer ni événement à analyser. `onChunk` est
 * appelé à chaque fragment, ce qui laisse l'appelant accumuler comme il veut.
 *
 * Une erreur survenue **avant** le premier octet arrive en JSON et est traitée
 * comme pour `postAi`. Une coupure en cours de flux est signalée séparément :
 * le texte déjà affiché reste valable, et le prévenir vaut mieux que laisser
 * une réponse s'arrêter au milieu d'une phrase sans explication.
 */
export async function streamAi(
  path: string,
  body: unknown,
  onChunk: (text: string) => void,
  options?: { signal?: AbortSignal },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  let res: Response;

  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...(options?.signal ? { signal: options.signal } : {}),
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Connexion interrompue. Vérifie ton réseau et réessaie.",
    };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: await readError(res) };
  }

  // `text/plain` est ce que la route promet. Toute autre chose — au premier
  // chef une page HTML — ne doit surtout pas être affichée comme une réponse.
  if (!res.body || !isType(res, "text/plain")) {
    return { ok: false, status: res.status, error: FALLBACK };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      // `stream: true` : un caractère accentué peut être coupé entre deux
      // fragments, et un décodage indépendant produirait un losange noir.
      onChunk(decoder.decode(value, { stream: true }));
    }
    const rest = decoder.decode();
    if (rest) onChunk(rest);
    return { ok: true };
  } catch {
    return {
      ok: false,
      status: res.status,
      error: "La réponse a été interrompue. Réessaie dans un instant.",
    };
  } finally {
    reader.releaseLock();
  }
}
