import { expect, test, type Page } from "@playwright/test";

/**
 * Apparition au défilement de la landing.
 *
 * Le risque de cette fonctionnalité n'est pas l'animation : c'est le contenu
 * masqué qui ne réapparaît jamais. Ces tests visent ce risque, pas l'effet.
 */

/** Fait défiler comme un lecteur, par écrans successifs, jusqu'au bas de page. */
async function scrollThrough(page: Page): Promise<void> {
  // Par paliers, et non d'un bond : un saut direct ferait passer les sections
  // intermédiaires sans qu'elles croisent jamais l'écran, ce qui ne
  // correspondrait à aucun usage réel.
  for (let i = 0; i < 30; i++) {
    const done = await page.evaluate(() => {
      window.scrollBy({ top: window.innerHeight * 0.7, behavior: "instant" });
      return (
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2
      );
    });
    await page.waitForTimeout(120);
    if (done) break;
  }
}

test.describe("Apparition au défilement", () => {
  test("un bloc sous la ligne de flottaison attend son tour, puis apparaît", async ({
    page,
  }) => {
    await page.goto("/");

    const grid = page.locator("#tarifs [data-reveal-group]");

    // Avant le défilement : masqué, et sans la marque d'apparition.
    await expect(grid).not.toHaveAttribute("data-revealed", "");
    await expect(grid.locator("> *").first()).toHaveCSS("opacity", "0");

    await grid.scrollIntoViewIfNeeded();

    await expect(grid).toHaveAttribute("data-revealed", "");
    await expect(grid.locator("> *").first()).toHaveCSS("opacity", "1");
  });

  test("aucun bloc ne reste invisible après avoir parcouru la page", async ({
    page,
  }) => {
    await page.goto("/");
    await scrollThrough(page);

    // Le filet de sécurité : après lecture complète, plus rien ne doit être
    // en attente. Un bloc oublié ici serait invisible pour un vrai visiteur.
    await expect(
      page.locator(
        "[data-reveal]:not([data-revealed]), [data-reveal-group]:not([data-revealed])",
      ),
    ).toHaveCount(0);
  });

  test("le hero reste visible d'emblée", async ({ page }) => {
    await page.goto("/");

    // Il est au-dessus de la ligne de flottaison et porte déjà ses propres
    // animations : le faire apparaître retarderait le premier affichage.
    const hero = page.locator("#accueil");
    await expect(hero).not.toHaveAttribute("data-reveal", "");
    await expect(hero.getByRole("heading", { level: 1 })).toHaveCSS(
      "opacity",
      "1",
    );
  });
});

test.describe("Apparition au défilement, mouvement réduit", () => {
  test.use({ reducedMotion: "reduce" });

  test("n'anime ni ne masque rien", async ({ page }) => {
    await page.goto("/");

    // Le script renonce : la classe n'est jamais posée. C'est aussi ce qui
    // garantit qu'une page sans JavaScript reste entièrement lisible, puisque
    // tout l'état masqué en dépend.
    await expect(page.locator("html")).not.toHaveClass(/js-reveal/);

    // Et le contenu du bas de page est lisible sans avoir défilé.
    await expect(
      page.locator("#tarifs [data-reveal-group] > *").first(),
    ).toHaveCSS("opacity", "1");
  });
});
