import { expect, test } from "@playwright/test";
import { KHOLLES_OFFERTES, PLAN_LIMITS } from "@/lib/billing/plans";

test.describe("Landing page", () => {
  test("présente la proposition de valeur et mène à l'inscription", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /khôlle blanche avant la vraie/i }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: /Commencer gratuitement/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByRole("heading", { name: /Crée ton compte/i })).toBeVisible();
  });

  test("expose les deux offres tarifaires", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("0€", { exact: true })).toBeVisible();
    await expect(page.getByText("12,90€", { exact: true })).toBeVisible();
  });

  test("annonce des volumes de khôlles tenables, sans promesse d'illimité", async ({
    page,
  }) => {
    await page.goto("/");

    // Une khôlle coûte environ 0,33 € d'API : « sans limite » était la
    // formulation qui rendait la marge négative sur les meilleurs abonnés.
    await expect(page.getByText(/sans limite pratique/i)).toHaveCount(0);
    await expect(page.getByText(/khôlle blanche complète par jour/i)).toHaveCount(0);

    const tarifs = page.locator("#tarifs");

    // Le gratuit est un essai : aucune promesse de récurrence dans les offres.
    // La portée s'arrête aux tarifs — ailleurs, « une khôlle par semaine »
    // décrit le rythme réel d'un prépa, ce qui reste vrai et utile.
    await expect(tarifs.getByText(/par semaine/i)).toHaveCount(0);
    await expect(tarifs.getByText(/pour toujours/i)).toHaveCount(0);
    await expect(tarifs.getByText(/Essai gratuit/i).first()).toBeVisible();

    // Volumes dérivés de la source unique : ajuster l'offre ne demande plus de
    // retoucher ce test, et un écart entre l'offre et la page le fait échouer.
    await expect(
      tarifs.getByText(
        new RegExp(`${KHOLLES_OFFERTES} khôlles blanches complètes`, "i"),
      ),
    ).toBeVisible();
    await expect(
      tarifs.getByText(
        new RegExp(`${PLAN_LIMITS.pro.kholles} khôlles blanches par mois`, "i"),
      ),
    ).toBeVisible();
  });

  test("montre une khôlle en cours dès le premier écran", async ({ page }) => {
    await page.goto("/");

    // La maquette du hero est l'argument principal : elle doit montrer
    // l'épreuve, pas des statistiques génériques. Les bulles flottantes sont
    // masquées sous `sm`, donc on cible la maquette elle-même.
    const mockup = page.getByText("Khôlle de maths · MPSI").locator("xpath=ancestor::div[3]");

    await expect(page.getByText("Khôlle de maths · MPSI")).toBeVisible();
    // Le khôlleur par défaut est nommé : la maquette doit le montrer ainsi.
    await expect(mockup.getByText(/Hélène t'interrompt/)).toBeVisible();
    await expect(mockup.getByText(/hypothèses/)).toBeVisible();
  });

  test("expose les mécanismes qui la distinguent, chiffres à l'appui", async ({
    page,
  }) => {
    await page.goto("/");

    const section = page.locator("#ce-qui-change");
    await expect(section).toBeVisible();

    // Les chiffres sont dérivés du moteur : s'ils changent là-bas, ils changent
    // ici, et ce test le signale plutôt que de laisser la page mentir.
    for (const figure of ["4", "6", "30"]) {
      await expect(
        section.getByText(figure, { exact: true }).first(),
      ).toBeVisible();
    }

    // La ligne qui porte la section.
    await expect(
      section.getByText(/Un khôlleur cherche à savoir si tu sais/i),
    ).toBeVisible();
  });

  test("ne nomme aucun concurrent", async ({ page }) => {
    await page.goto("/");

    // La différence se démontre par la précision des mécanismes, jamais en
    // désignant quelqu'un : c'est défensif, et ça date la page.
    for (const name of ["ChatGPT", "GPT", "OpenAI", "Gemini", "Copilot"]) {
      await expect(page.getByText(name, { exact: false })).toHaveCount(0);
    }
  });

  test("illustre la progression sans la faire passer pour un compte réel", async ({
    page,
  }) => {
    await page.goto("/");

    const section = page.locator("#progression");
    await expect(section).toBeVisible();

    // Les khôlles sont désormais enregistrées, la vitrine a donc le droit de
    // montrer la courbe — mais elle doit dire que les chiffres sont inventés,
    // sinon c'est une copie d'écran truquée.
    await expect(section.getByText(/données fictives/i)).toBeVisible();

    // Et annoncer ce que l'élève verra vraiment en arrivant : une courbe vide.
    await expect(
      section.getByText(/cette courbe part vide et se remplit/i),
    ).toBeVisible();
  });

  test("ne promet plus de fonctionnalité retirée du produit", async ({ page }) => {
    await page.goto("/");

    // Ces promesses survivaient au recentrage et n'existent plus.
    for (const stale of ["annales interactives", "Tuteur IA", "Quiz Wars"]) {
      await expect(page.getByText(stale, { exact: false })).toHaveCount(0);
    }
  });

  test("annonce les formats que le moteur sait réellement jouer", async ({
    page,
  }) => {
    await page.goto("/#filieres");

    // La section est dérivée de lib/kholle/formats.ts : les filières annoncées
    // doivent correspondre à des formats existants.
    await expect(
      page.getByRole("heading", { name: /Chaque filière a son format/i }),
    ).toBeVisible();

    for (const format of ["Question de cours puis exercice", "Exposé puis entretien"]) {
      await expect(page.getByRole("heading", { name: format })).toBeVisible();
    }
  });

  test("le menu est utilisable au doigt sur mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    // Sur mobile la pilule de navigation est remplacée par un panneau.
    await page.getByRole("button", { name: /Ouvrir le menu/i }).click();

    const panel = page.getByRole("dialog", { name: "Menu" });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link", { name: "Tarifs" })).toBeVisible();

    await panel.getByRole("link", { name: "Tarifs" }).click();
    await expect(panel).toBeHidden();
    await expect(page).toHaveURL(/#tarifs/);
  });
});

test.describe("Dashboard", () => {
  test("met la khôlle au centre, pas un catalogue de modules", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    const main = page.getByRole("main");

    // Sur un compte sans khôlle passée, l'écran invite à la première plutôt
    // que d'afficher une échéance et un taux de préparation inventés.
    await expect(
      main.getByRole("heading", { name: /Passe ta première khôlle blanche/i }),
    ).toBeVisible();

    // Une seule action principale, qui mène à l'épreuve.
    await expect(
      main.getByRole("link", { name: /Commencer une khôlle/i }),
    ).toBeVisible();

    for (const section of ["Préparer la khôlle", "Autour"]) {
      await expect(
        main.getByRole("heading", { name: section, exact: false }),
      ).toBeVisible();
    }
  });

  test("ne propose plus les modules de jeu retirés", async ({ page }) => {
    await page.goto("/dashboard");

    // Le recentrage sur la khôlle implique leur disparition complète.
    for (const gone of ["Quiz Wars", "Mode Survie", "Millionnaire", "Territoire"]) {
      await expect(page.getByText(gone, { exact: false })).toHaveCount(0);
    }

    const response = await page.goto("/quiz-wars");
    expect(response?.status()).toBe(404);
  });

  test("chaque module actif mène à une page réelle", async ({ page }) => {
    const modules = [
      { slug: "kholle", heading: /Khôlle blanche/i },
      { slug: "cours", heading: /Mes cours/i },
      { slug: "prof-ia", heading: /Kollia/i },
      { slug: "flashcards", heading: /Questions de cours/i },
      { slug: "exercices", heading: /Exos au tableau/i },
      { slug: "annales", heading: /Annales/i },
      { slug: "planning", heading: /Planning/i },
      { slug: "podcast", heading: /Podcast/i },
    ];

    for (const mod of modules) {
      await page.goto(`/${mod.slug}`);
      await expect(
        page.getByRole("heading", { name: mod.heading }).first(),
        `le module ${mod.slug} doit afficher son titre`,
      ).toBeVisible();
    }
  });

  test("un module non livré affiche un état « bientôt », pas une erreur", async ({
    page,
  }) => {
    await page.goto("/annales");
    await expect(
      page.getByRole("heading", { name: /Annales d'oraux/i }),
    ).toBeVisible();
    await expect(page.getByText(/Bientôt/i).first()).toBeVisible();
  });

  test("une route inconnue renvoie la page 404", async ({ page }) => {
    const response = await page.goto("/ce-module-nexiste-pas");
    expect(response?.status()).toBe(404);
    await expect(page.getByText(/404/)).toBeVisible();
  });
});
