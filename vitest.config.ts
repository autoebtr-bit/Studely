import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    // Les tests Playwright vivent dans tests/e2e et ont leur propre runner.
    //
    // `tests/launch/` est également exclu : ces contrôles échouent par
    // construction tant que le site n'est pas prêt à ouvrir (mentions légales
    // non renseignées, notamment). Les inclure rendrait la suite durablement
    // rouge, et le rouge cesserait d'être un signal. Ils se lancent par
    // `npm run check:launch`.
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
