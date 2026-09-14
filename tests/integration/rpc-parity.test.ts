import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Parité des fonctions Postgres : TypeScript ↔ migrations.
 *
 * Les noms de RPC vivent en double — dans le bloc `Functions` de
 * `lib/supabase/types.ts`, écrit à la main, et dans les migrations, seule
 * autorité réelle. Rien ne confronte les deux : renommer une fonction SQL sans
 * toucher au TypeScript **compile sans broncher**.
 *
 * Ce test existe parce que ce bug a été commis. Sa conséquence aurait été
 * silencieuse : `guard.ts` avale les erreurs de `free_tier_spend_this_month`
 * par conception — un garde-fou ne doit pas devenir la cause d'une panne — donc
 * le plafond de dépense aurait été désactivé sans que rien ne le signale.
 *
 * Contrôle volontairement unidirectionnel : toute fonction **appelée depuis le
 * code** doit exister en SQL, mais l'inverse est permis. `kholle_period_start`
 * n'est appelée que par d'autres fonctions SQL et n'a pas à être déclarée ici.
 */

const ROOT = process.cwd();

const TYPES = readFileSync(join(ROOT, "lib", "supabase", "types.ts"), "utf8");

const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
  .join("\n");

/** Noms déclarés sous `Functions: { ... }` dans le typage de la base. */
function declaredRpcNames(): string[] {
  const start = TYPES.indexOf("Functions: {");
  expect(start, "bloc `Functions` absent de types.ts").toBeGreaterThan(-1);

  // Le bloc se termine à la déclaration suivante de même niveau.
  const end = TYPES.indexOf("Enums: {", start);
  const block = TYPES.slice(start, end === -1 ? undefined : end);

  // Une entrée de RPC s'ouvre toujours par `<nom>: {` en début de ligne.
  const names: string[] = [];
  const re = /^\s{6}(\w+):\s*\{/gm;

  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) names.push(match[1]!);

  return names;
}

/** Fonctions réellement créées par les migrations. */
function definedSqlFunctions(): Set<string> {
  const defined = new Set<string>();
  const re = /create\s+or\s+replace\s+function\s+public\.(\w+)/g;

  let match: RegExpExecArray | null;
  while ((match = re.exec(MIGRATIONS)) !== null) defined.add(match[1]!);

  return defined;
}

describe("parité des RPC : TypeScript ↔ migrations", () => {
  const declared = declaredRpcNames();
  const defined = definedSqlFunctions();

  it("lit bien les deux côtés", () => {
    // Garde-fou du test lui-même : une expression régulière qui ne matche plus
    // rendrait la suite verte sans rien vérifier.
    expect(declared.length, "aucune RPC lue dans types.ts").toBeGreaterThan(3);
    expect(defined.size, "aucune fonction lue dans les migrations").toBeGreaterThan(5);
  });

  it("définit en SQL chaque fonction appelée depuis le code", () => {
    for (const name of declared) {
      expect(
        defined.has(name),
        `« ${name} » est déclarée dans types.ts mais aucune migration ne la crée — ` +
          `l'appel échouerait à l'exécution, pas à la compilation`,
      ).toBe(true);
    }
  });

  it("rend à `authenticated` toute fonction retirée à `public`", () => {
    // Postgres accorde l'exécution à `public` par défaut : une fonction jamais
    // révoquée est déjà appelable et n'a pas besoin de `grant`. Mais une
    // fonction révoquée SANS attribution derrière devient inappelable depuis
    // l'application, et l'erreur n'apparaîtrait qu'en production.
    for (const name of declared) {
      const revoked = MIGRATIONS.includes(
        `revoke all on function public.${name}`,
      );
      if (!revoked) continue;

      expect(
        MIGRATIONS.includes(`grant execute on function public.${name}`),
        `« ${name} » est retirée à public sans être rendue à authenticated — ` +
          `elle serait inappelable depuis l'application`,
      ).toBe(true);
    }
  });
});
