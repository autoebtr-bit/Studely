import { afterEach, describe, expect, it, vi } from "vitest";
import { postAi, streamAi } from "@/lib/api/ai";

/**
 * L'assistant de requête vers les routes d'IA.
 *
 * Ce qui est réellement en jeu ici n'est pas technique. Nos routes renvoient
 * des messages déjà rédigés pour un élève, et trois d'entre eux portent la
 * décision d'achat : « ton essai gratuit est terminé », « cette fonctionnalité
 * fait partie de l'offre Pro », « tu as atteint ta limite quotidienne ». Les
 * remplacer par un « une erreur est survenue » générique supprimerait le seul
 * moment où l'abonnement se propose de lui-même.
 */

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockFetch(response: Response | Error) {
  // Paramètres typés explicitement : sans eux, `mock.calls` se résout en `[]`
  // et la vérification du corps envoyé ne compile pas.
  const fn = vi.fn((_path: string, _init: RequestInit) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("postAi", () => {
  it("renvoie les données quand la route répond", async () => {
    mockFetch(jsonResponse({ created: 12 }, 200));

    const result = await postAi<{ created: number }>("/api/ai/flashcards", {
      chapterId: "abc",
    });

    expect(result).toEqual({ ok: true, data: { created: 12 } });
  });

  it("poste bien du JSON en POST", async () => {
    const fetchMock = mockFetch(jsonResponse({}, 200));

    await postAi("/api/ai/podcast", { chapterId: "abc" });

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const [path, init] = call!;
    expect(path).toBe("/api/ai/podcast");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(init.body).toBe(JSON.stringify({ chapterId: "abc" }));
  });

  it.each([
    [
      429,
      "Ton essai gratuit est terminé : tes 3 khôlles blanches ont été utilisées. Passe au Pro pour continuer.",
    ],
    [429, "Cette fonctionnalité fait partie de l'offre Pro."],
    [429, "Tu as atteint ta limite quotidienne (40). Elle se réinitialise demain, ou passe à Pro pour la lever."],
    [503, "Cette fonctionnalité s'active très bientôt. Rien ne t'a été décompté."],
    [503, "L'essai gratuit est momentanément suspendu, le temps que nous rouvrions les accès."],
  ])("remonte mot pour mot le message d'un %i", async (status, message) => {
    mockFetch(jsonResponse({ error: message }, status));

    const result = await postAi("/api/ai/chat", {});

    expect(result).toEqual({ ok: false, status, error: message });
  });

  it("remonte aussi le message des erreurs moins attendues", async () => {
    // 404 « chapitre sans leçon », 400 « ajoute un chapitre avant de générer » :
    // ces messages disent quoi faire. Les écraser laisserait l'élève bloqué
    // sans savoir quoi corriger.
    mockFetch(jsonResponse({ error: "Ce chapitre ne contient aucune leçon." }, 404));

    const result = await postAi("/api/ai/podcast", {});

    expect(result).toEqual({
      ok: false,
      status: 404,
      error: "Ce chapitre ne contient aucune leçon.",
    });
  });

  it("retombe sur un message générique si le corps n'explique rien", async () => {
    mockFetch(new Response("", { status: 500 }));

    const result = await postAi("/api/ai/chat", {});

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).not.toBe("");
    expect(result.status).toBe(500);
  });

  it("refuse une page HTML reçue à la place du JSON", async () => {
    // Bug réel : le middleware redirigeait un appel d'API non authentifié vers
    // `/login`. `fetch` suit la redirection en silence, donc le client recevait
    // la page de connexion en HTML avec un statut 200.
    mockFetch(
      new Response("<!doctype html><html><body>Connexion</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );

    const result = await postAi("/api/ai/flashcards", {});

    expect(result.ok).toBe(false);
  });

  it("distingue une coupure réseau d'un refus du serveur", async () => {
    // Statut 0 et pas 429 : une perte de connexion ne doit jamais s'afficher
    // comme un quota atteint, sinon l'élève croit avoir tout consommé.
    mockFetch(new TypeError("Failed to fetch"));

    const result = await postAi("/api/ai/chat", {});

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(0);
    expect(result.error).toMatch(/réseau/i);
  });
});

describe("streamAi", () => {
  function textStream(...chunks: Uint8Array[]): Response {
    return new Response(
      new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk);
          controller.close();
        },
      }),
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  it("n'affiche jamais une page HTML comme si Kollia l'avait dictée", async () => {
    // C'est ici que le bug était le plus visible : un flux accepté sans
    // vérifier son type aurait recopié le code source de la page de connexion
    // dans la bulle de réponse, mot à mot, comme une vraie réponse.
    const html = "<!doctype html><html><body>Connexion</body></html>";
    mockFetch(
      new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
    );

    const received: string[] = [];
    const result = await streamAi("/api/ai/chat", {}, (t) => received.push(t));

    expect(result.ok).toBe(false);
    expect(received).toEqual([]);
  });

  it("transmet les fragments dans l'ordre", async () => {
    const encoder = new TextEncoder();
    mockFetch(
      textStream(encoder.encode("Bonjour "), encoder.encode("les colles.")),
    );

    const received: string[] = [];
    const result = await streamAi("/api/ai/chat", {}, (t) => received.push(t));

    expect(result).toEqual({ ok: true });
    expect(received.join("")).toBe("Bonjour les colles.");
  });

  it("recolle un caractère accentué coupé entre deux fragments", async () => {
    // « é » en UTF-8 vaut deux octets. Décodés séparément, ils donnent deux
    // losanges noirs — et le français en est truffé.
    const bytes = new TextEncoder().encode("khôlle");
    mockFetch(textStream(bytes.slice(0, 3), bytes.slice(3)));

    let text = "";
    const result = await streamAi("/api/ai/chat", {}, (t) => (text += t));

    expect(result).toEqual({ ok: true });
    expect(text).toBe("khôlle");
  });

  it("remonte le message d'un refus arrivé avant le flux", async () => {
    mockFetch(
      jsonResponse({ error: "Cette fonctionnalité fait partie de l'offre Pro." }, 429),
    );

    const result = await streamAi("/api/ai/chat", {}, () => {});

    expect(result).toEqual({
      ok: false,
      status: 429,
      error: "Cette fonctionnalité fait partie de l'offre Pro.",
    });
  });
});
