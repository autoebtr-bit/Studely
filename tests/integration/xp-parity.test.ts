import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { XP_RULES, type XpKind } from "@/lib/xp/rules";
import { MAX_LEVEL, buildLevelTable } from "@/lib/xp/level";

/**
 * Le barème d'XP et la courbe de niveaux existent en double : en TypeScript
 * (pour l'UI et les tests) et en SQL (pour `award_xp`, seule autorité réelle).
 *
 * Cette duplication est assumée — le serveur ne peut pas importer du TS dans
 * une fonction Postgres — mais elle doit rester synchronisée. Ces tests lisent
 * `supabase/seed.sql` et le comparent aux constantes TypeScript : modifier
 * l'un sans l'autre fait échouer la suite.
 */

const SEED = readFileSync(
  join(process.cwd(), "supabase", "seed.sql"),
  "utf8",
);

/** Extrait les tuples de l'insertion dans `xp_rules`. */
function parseSeedXpRules(): Map<string, { base: number; dailyCap: number | null }> {
  const start = SEED.indexOf("insert into public.xp_rules");
  expect(start, "bloc xp_rules absent de seed.sql").toBeGreaterThan(-1);

  const end = SEED.indexOf("on conflict (kind)", start);
  const block = SEED.slice(start, end);

  const rows = new Map<string, { base: number; dailyCap: number | null }>();
  const re = /\('([a-z_]+)',\s*(\d+),\s*(null|\d+),/g;

  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    const [, kind, base, cap] = match;
    rows.set(kind!, {
      base: Number(base),
      dailyCap: cap === "null" ? null : Number(cap),
    });
  }
  return rows;
}

describe("parité barème XP : TypeScript ↔ seed.sql", () => {
  const seedRules = parseSeedXpRules();

  it("le seed contient au moins une règle", () => {
    expect(seedRules.size).toBeGreaterThan(0);
  });

  it("déclare exactement les mêmes types d'événements des deux côtés", () => {
    const tsKinds = Object.keys(XP_RULES).sort();
    const sqlKinds = [...seedRules.keys()].sort();
    expect(sqlKinds).toEqual(tsKinds);
  });

  it("attribue le même gain de base et le même plafond à chaque événement", () => {
    for (const [kind, rule] of Object.entries(XP_RULES)) {
      const seeded = seedRules.get(kind);
      expect(seeded, `règle « ${kind} » absente de seed.sql`).toBeDefined();
      expect(seeded!.base, `base de « ${kind} »`).toBe(rule.base);
      expect(seeded!.dailyCap, `plafond de « ${kind} »`).toBe(rule.dailyCap);
    }
  });

  it("n'introduit pas de règle SQL inconnue du typage TypeScript", () => {
    for (const kind of seedRules.keys()) {
      expect(XP_RULES[kind as XpKind], `« ${kind} » inconnu côté TS`).toBeDefined();
    }
  });
});

describe("parité courbe de niveaux : TypeScript ↔ seed.sql", () => {
  it("utilise la même formule 50 × (L−1) × L", () => {
    expect(SEED).toContain("50 * (l - 1) * l");
  });

  it("génère la table jusqu'au même niveau maximum", () => {
    expect(SEED).toContain(`generate_series(1, ${MAX_LEVEL})`);
  });

  it("applique les mêmes paliers de titres", () => {
    const table = buildLevelTable();

    // Chaque palier déclaré côté TS doit apparaître dans le CASE du seed.
    const expectedTitles = [
      { level: 20, title: "Légende" },
      { level: 16, title: "Maître" },
      { level: 12, title: "Expert" },
      { level: 8, title: "Stratège" },
      { level: 5, title: "Assidu" },
      { level: 3, title: "Apprenti" },
    ];

    for (const { level, title } of expectedTitles) {
      // Le seed aligne les `when` sur plusieurs espaces : on tolère le
      // formatage, mais pas un seuil ou un titre différent.
      const clause = new RegExp(`when\\s+l\\s*>=\\s*${level}\\s+then\\s+'${title}'`);
      expect(
        clause.test(SEED),
        `palier niveau ${level} → « ${title} » absent du seed`,
      ).toBe(true);

      // Et le TS doit bien attribuer ce titre à ce niveau.
      expect(table[level - 1]?.title).toBe(title);
    }

    expect(table[0]?.title).toBe("Novice");
    expect(/else\s+'Novice'/.test(SEED)).toBe(true);
  });
});

describe("cohérence interne du barème", () => {
  it("garde chaque plafond journalier au moins égal au gain d'un événement", () => {
    for (const rule of Object.values(XP_RULES)) {
      if (rule.dailyCap === null) continue;
      expect(
        rule.dailyCap,
        `le plafond de « ${rule.kind} » rend l'événement inutile`,
      ).toBeGreaterThanOrEqual(rule.base);
    }
  });

  it("donne un libellé non vide à chaque règle", () => {
    for (const rule of Object.values(XP_RULES)) {
      expect(rule.label.trim().length).toBeGreaterThan(0);
    }
  });
});
