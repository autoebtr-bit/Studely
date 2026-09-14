import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

/**
 * Contrôles de pré-lancement, lancés par `npm run check:launch`.
 *
 * Configuration séparée parce qu'ils **échouent par construction** tant que le
 * site n'est pas prêt à ouvrir : mentions légales non renseignées, notamment.
 * Les mêler à `npm run test` rendrait la suite durablement rouge, et un rouge
 * permanent finit par ne plus être lu — c'est précisément ce qui laisse passer
 * les vraies régressions.
 */
export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ["tests/launch/**/*.test.ts"],
    },
  }),
);
