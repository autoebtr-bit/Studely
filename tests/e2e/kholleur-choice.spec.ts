import { expect, test } from "@playwright/test";

/**
 * Le choix du khôlleur.
 *
 * Chromium tourne sans voix installée : `speechSynthesis.getVoices()` renvoie
 * une liste vide, et le composant affiche alors son repli « aucune voix ». Sans
 * la fausse voix injectée ci-dessous, ce test vérifierait le message d'erreur,
 * pas l'écran réel.
 */
const STUB = `
  const voices = [
    { name: "Microsoft Denise Online (Natural) - French (France)", lang: "fr-FR", voiceURI: "denise", localService: false, default: true },
    { name: "Microsoft Paul - French (France)", lang: "fr-FR", voiceURI: "paul", localService: true, default: false },
  ];
  window.speechSynthesis = {
    getVoices: () => voices,
    speak: () => {},
    cancel: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    speaking: false,
    paused: false,
    pending: false,
  };
`;

test.describe("Choix du khôlleur", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(STUB);
    await page.goto("/kholle");
  });

  test("propose deux khôlleurs nommés, et rien de plus", async ({ page }) => {
    // Les deux prénoms sont proposés…
    await expect(page.getByRole("button", { name: "Écouter Hélène" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Écouter Vincent" })).toBeVisible();

    // …et il n'y en a pas d'autres : la promesse est « une voix de femme ou
    // une voix d'homme », pas un catalogue de réglages.
    await expect(page.getByRole("button", { name: /^Écouter / })).toHaveCount(2);

    // Les anciens noms de réglages ne doivent plus apparaître nulle part.
    for (const gone of ["Douce", "Très posée", "Exigeante", "Grave"]) {
      await expect(page.getByText(gone, { exact: true })).toHaveCount(0);
    }
  });

  test("garde le réglage de timbre sous les deux choix", async ({ page }) => {
    const timbre = page.getByLabel(/Timbre/);
    await expect(timbre).toBeVisible();
    // Le sélecteur liste bien les voix de l'appareil, il n'est pas décoratif.
    await expect(timbre.locator("option")).not.toHaveCount(0);
  });

  test("choisir Vincent le marque comme actif", async ({ page }) => {
    const vincent = page.getByRole("button", { name: /^Vincent/ });
    await vincent.click();
    await expect(vincent).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: /^Hélène/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
