import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Configuration d'exécution des routes qui appellent le modèle.
 *
 * Ce test existe parce que l'oubli qu'il couvre était déjà en place sur les six
 * routes d'IA : aucune ne déclarait `maxDuration`. La conséquence ne se voit
 * jamais en développement — le serveur local n'impose aucune limite — et
 * n'apparaît qu'une fois déployé, sous la forme d'une génération coupée au
 * bout de dix secondes alors que le code est sain.
 *
 * Une route qui appelle `claude-opus-5` en effort élevé dépasse toujours ce
 * délai : la notation d'une khôlle et la construction d'un planning y passent
 * une bonne minute.
 */

const ROOT = process.cwd();
const API_DIR = join(ROOT, "app", "api");

/** Chemins de tous les `route.ts` sous `app/api`, récursivement. */
function routeFiles(dir: string): string[] {
  const found: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...routeFiles(full));
    else if (entry.name === "route.ts") found.push(full);
  }
  return found;
}

/**
 * Une route parle-t-elle au modèle ?
 *
 * Détecté par l'import du garde plutôt que par le chemin : une future route
 * rangée ailleurs qu'`app/api/ai/` serait quand même couverte, et une route
 * technique qui n'appelle rien n'a pas à déclarer de délai.
 */
function callsTheModel(source: string): boolean {
  return source.includes("guardAiRoute");
}

const ROUTES = routeFiles(API_DIR).map((path) => ({
  path,
  relative: path.slice(ROOT.length + 1).replace(/\\/g, "/"),
  source: readFileSync(path, "utf8"),
}));

const AI_ROUTES = ROUTES.filter((r) => callsTheModel(r.source));

describe("configuration des routes d'IA", () => {
  it("trouve les routes qui appellent le modèle", () => {
    // Garde-fou du test lui-même : si la détection cesse de fonctionner, il
    // passerait au vert en ne vérifiant plus rien.
    expect(AI_ROUTES.length).toBeGreaterThanOrEqual(6);
  });

  it.each(AI_ROUTES.map((r) => [r.relative, r.source] as const))(
    "%s déclare maxDuration",
    (_relative, source) => {
      expect(source).toMatch(/^export const maxDuration = \d+;$/m);
    },
  );

  it.each(AI_ROUTES.map((r) => [r.relative, r.source] as const))(
    "%s reste sous le plafond de 60 s",
    (_relative, source) => {
      const match = /^export const maxDuration = (\d+);$/m.exec(source);
      expect(match).not.toBeNull();

      // Au-delà de 60, la valeur est refusée par les offres d'entrée de gamme
      // au lieu d'être accordée : la route repasserait au délai par défaut,
      // c'est-à-dire exactement le problème qu'on cherche à éviter.
      expect(Number(match![1])).toBeLessThanOrEqual(60);
    },
  );

  it.each(AI_ROUTES.map((r) => [r.relative, r.source] as const))(
    "%s s'exécute sur le runtime Node",
    (_relative, source) => {
      // Le SDK Anthropic et `server-only` supposent Node. Sur le runtime Edge,
      // l'échec est à l'import, donc avant toute réponse utile.
      expect(source).toMatch(/^export const runtime = "nodejs";$/m);
    },
  );
});
