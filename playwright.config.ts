import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    locale: "fr-FR",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],

  // Les tests tournent sur le build de production : c'est ce qui part sur
  // Vercel, et le mode dev masque certaines erreurs de prérendu.
  //
  // `NEXT_DIST_DIR` isole ce build dans `.next-e2e` : sinon il écraserait le
  // `.next` d'un serveur de développement en cours, qui servirait alors des
  // chunks JS disparus.
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",

      // Supabase volontairement neutralisé pour la suite E2E.
      //
      // Sans ça, le serveur de test hériterait du `.env.local` du développeur :
      // le middleware exigerait une session et redirigerait chaque écran vers
      // `/login`, ce qui ne testerait plus rien.
      //
      // Ce que la suite couvre donc, c'est l'expérience d'un compte SANS
      // données — celle de tout nouvel inscrit, et le moment où l'on perd le
      // plus d'élèves. Les parcours qui exigent des données réelles (réviser
      // une fiche, valider une séance) demanderont un compte de test alimenté,
      // à mettre en place avec le déploiement.
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    },
  },
});
