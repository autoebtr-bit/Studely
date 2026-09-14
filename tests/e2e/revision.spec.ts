import { expect, test } from "@playwright/test";

/**
 * L'application sans données — ce que voit tout nouvel inscrit.
 *
 * Ces écrans testaient auparavant un étudiant fictif doté de cours et de
 * fiches. Cet étudiant n'existe plus : chaque écran lit la base, et un compte
 * neuf n'a rien. C'est le moment où l'on perd le plus d'élèves, donc celui qui
 * mérite le plus d'être verrouillé.
 *
 * Les parcours qui exigent des données réelles — réviser une carte, valider une
 * séance — demanderont un compte de test alimenté. À mettre en place avec le
 * déploiement.
 */
test.describe("Premier lancement", () => {
  test("les écrans vides expliquent, au lieu de ressembler à une panne", async ({
    page,
  }) => {
    const ecrans = [
      { path: "/cours", attendu: /Aucun cours pour l'instant/i },
      { path: "/flashcards", attendu: /Aucune question de cours à réviser/i },
      { path: "/exercices", attendu: /Aucun exercice pour l'instant/i },
      { path: "/podcast", attendu: /Aucun podcast pour l'instant/i },
      { path: "/planning", attendu: /Aucune séance planifiée/i },
      { path: "/progression", attendu: /Ta première khôlle apparaîtra ici/i },
    ];

    for (const { path, attendu } of ecrans) {
      await page.goto(path);
      await expect(page.getByText(attendu), `${path} sans état vide`).toBeVisible();
    }
  });

  test("chaque écran vide propose une action, jamais une impasse", async ({
    page,
  }) => {
    // Un écran vide sans issue fait partir l'élève. Chacun doit mener quelque
    // part : passer une khôlle, ou importer un cours.
    for (const path of ["/cours", "/flashcards", "/exercices", "/planning"]) {
      await page.goto(path);

      const actions = page.getByRole("link", {
        name: /Passer une khôlle|Importer un cours|Voir mes cours/i,
      });
      await expect(
        actions.first(),
        `${path} n'offre aucune issue`,
      ).toBeVisible();
    }
  });

  test("le tableau de bord invite à la première khôlle", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", { name: /Passe ta première khôlle blanche/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Commencer une khôlle/i }),
    ).toBeVisible();
  });
});

test.describe("Progression", () => {
  test("montre l'état vide tant qu'aucune khôlle n'a été passée", async ({
    page,
  }) => {
    await page.goto("/progression");

    // Sans base branchée, aucune séance n'existe — et c'est exactement ce que
    // verra tout nouvel inscrit. L'écran doit expliquer, pas ressembler à une
    // panne.
    await expect(
      page.getByText(/Ta première khôlle apparaîtra ici/i),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Passer une khôlle/i }),
    ).toBeVisible();
  });
});

test.describe("Kollia", () => {
  test("pose la question et dit franchement quand elle ne peut pas répondre", async ({
    page,
  }) => {
    await page.goto("/prof-ia");

    await expect(
      page.getByText(/Qu'est-ce qui te bloque aujourd'hui/i),
    ).toBeVisible();

    await page.getByRole("button", { name: /récurrence/i }).click();

    // La question posée s'affiche : c'est elle qui prouve que le formulaire
    // fonctionne, indépendamment de ce que le serveur répond.
    await expect(
      page.getByText(/Explique-moi le raisonnement par récurrence/i),
    ).toBeVisible();

    // Sans base ni clé, la route refuse : l'écran doit le dire. Une bulle vide
    // au nom de Kollia ferait croire qu'elle n'a rien à répondre.
    //
    // Le sélecteur vise le bandeau précis, pas `role="alert"` : Next pose son
    // propre annonceur de route avec ce rôle, et la recherche serait ambiguë.
    await expect(
      page.locator('p[role="alert"]').filter({ hasText: /\S/ }),
    ).toBeVisible({ timeout: 15_000 });
  });

  /**
   * Ce test garde contre une régression précise, et déjà présente : la réponse
   * de Kollia a longtemps été une chaîne écrite en dur, affichée mot à mot pour
   * imiter un flux. Un élève ne pouvait pas le distinguer d'une vraie réponse.
   */
  test("ne fabrique jamais de réponse hors connexion", async ({ page }) => {
    await page.goto("/prof-ia");
    await page.getByRole("button", { name: /récurrence/i }).click();

    // Laisser largement le temps à une éventuelle simulation de se dérouler.
    await page.waitForTimeout(3_000);

    await expect(page.getByText(/Bonne question/i)).toHaveCount(0);
    await expect(
      page.getByText(/identifie précisément ce que l'énoncé te demande/i),
    ).toHaveCount(0);
  });
});

test.describe("Correction d'exercice", () => {
  /**
   * Même classe de régression : la correction renvoyait toujours 75/100 avec
   * les mêmes points forts, après une fausse latence de 1,2 s. C'est la
   * simulation la plus coûteuse des trois — un élève qui découvre que sa note
   * était écrite d'avance ne revient pas.
   *
   * L'exercice n'existe pas sans base : la page répond 404, ce qui prouve déjà
   * qu'aucune note n'est produite sans données réelles.
   */
  test("aucune note n'est produite sans exercice réel", async ({ page }) => {
    const response = await page.goto(
      "/exercices/00000000-0000-4000-8000-000000000000",
    );

    expect(response?.status()).toBe(404);
    await expect(page.getByText(/75/)).toHaveCount(0);
  });
});

test.describe("Chrono", () => {
  test("s'ouvre et démarre un décompte", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /Chrono/i }).click();
    await expect(page.getByText("25:00")).toBeVisible();

    await page.getByRole("button", { name: /Démarrer/i }).click();
    await expect(page.getByRole("button", { name: /Pause/i })).toBeVisible();
  });
});

test.describe("Accessibilité de base", () => {
  test("chaque page a un titre de niveau 1 unique", async ({ page }) => {
    for (const path of ["/", "/dashboard", "/cours", "/flashcards", "/progression"]) {
      await page.goto(path);
      const count = await page.getByRole("heading", { level: 1 }).count();
      expect(count, `${path} doit avoir exactement un <h1>`).toBe(1);
    }
  });

  test("la page ne défile pas horizontalement sur mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    for (const path of ["/", "/dashboard", "/cours", "/planning"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} déborde horizontalement`).toBeLessThanOrEqual(1);
    }
  });
});
