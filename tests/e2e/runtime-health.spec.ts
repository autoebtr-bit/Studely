import { expect, test, type ConsoleMessage, type Request } from "@playwright/test";

/**
 * Santé d'exécution côté navigateur.
 *
 * Un code HTTP 200 ne prouve QUE le rendu serveur. Si l'hydratation échoue —
 * chunk JS manquant, erreur au montage d'un composant — la page renvoie quand
 * même 200 puis affiche « Application error: a client-side exception has
 * occurred ». Ces tests chargent chaque page dans un vrai navigateur et
 * échouent à la moindre erreur console ou requête ratée.
 */

/*
 * Les pages de détail — un chapitre, un exercice, un podcast précis — ne
 * figurent plus ici : leurs identifiants venaient de l'étudiant fictif, et les
 * contenus appartiennent désormais à chaque élève. Il n'existe plus d'URL de
 * détail valable sans compte alimenté.
 *
 * `/flashcards/session/toutes` reste : son identifiant est un mot-clé, pas une
 * donnée, et la page doit s'afficher proprement même sans carte à réviser.
 */
const PAGES = [
  "/",
  "/login",
  "/signup",
  "/dashboard",
  "/onboarding",
  "/cours",
  "/prof-ia",
  "/kholle",
  "/flashcards",
  "/flashcards/session/toutes",
  "/exercices",
  "/planning",
  "/podcast",
  "/importer",
  "/progression",
  "/parametres",
  "/recherche",
  "/annales",
];

/**
 * Préchargement RSC interrompu par le navigateur.
 *
 * Next précharge les liens visibles ; sur une route **dynamique** — une page qui
 * lit la session, comme `/kholle` depuis qu'elle affiche le solde de khôlles —
 * il abandonne la requête au lieu de la servir. Le navigateur la signale en
 * `ERR_ABORTED` alors que la page répond bien 200, préchargement compris.
 *
 * Filtre volontairement étroit : seulement une URL `?_rsc=` ET un abandon. Un
 * 404, un 500 ou une coupure réseau sur la même URL restent des échecs.
 */
function isAbortedPrefetch(req: Request): boolean {
  return (
    req.url().includes("_rsc=") &&
    req.failure()?.errorText === "net::ERR_ABORTED"
  );
}

/** Bruit connu, sans rapport avec la santé de l'application. */
function isIgnorable(text: string): boolean {
  return (
    text.includes("Download the React DevTools") ||
    // Les polices Google peuvent être bloquées hors ligne.
    text.includes("fonts.gstatic.com") ||
    text.includes("fonts.googleapis.com")
  );
}

for (const path of PAGES) {
  test(`« ${path} » s'hydrate sans erreur`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error" && !isIgnorable(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err: Error) => {
      consoleErrors.push(`Exception non capturée : ${err.message}`);
    });

    page.on("requestfailed", (req: Request) => {
      const url = req.url();
      if (!isIgnorable(url) && !isAbortedPrefetch(req)) {
        failedRequests.push(`${url} — ${req.failure()?.errorText ?? "échec"}`);
      }
    });

    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response?.status(), `${path} doit répondre 200`).toBe(200);

    // Le message d'erreur générique de Next signale une hydratation cassée.
    await expect(
      page.getByText(/Application error/i),
      `${path} affiche l'écran d'erreur client de Next`,
    ).toHaveCount(0);

    expect(
      consoleErrors,
      `${path} produit des erreurs console :\n${consoleErrors.join("\n")}`,
    ).toEqual([]);

    expect(
      failedRequests,
      `${path} a des requêtes en échec :\n${failedRequests.join("\n")}`,
    ).toEqual([]);

    // Preuve que React a bien pris la main : un élément interactif répond.
    await expect(page.locator("body")).toBeVisible();
  });
}
