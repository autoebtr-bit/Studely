import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  KHOLLES_OFFERTES,
  PLAN_LIMITS,
  renews,
  type PlanTier,
} from "@/lib/billing/plans";
import { KHOLLE_FORMATS } from "@/lib/kholle/formats";
import { weightedScore } from "@/lib/kholle/history";
import { DEMO_KHOLLE_HISTORY } from "@/lib/marketing/content";

/**
 * Les volumes des offres existent en double : en TypeScript (pour la vitrine et
 * l'écran des paramètres) et en SQL (pour `consume_kholle` et `consume_quota`,
 * seules autorités réelles).
 *
 * Cette duplication est assumée — une fonction Postgres ne peut pas importer du
 * TypeScript — mais elle doit rester synchronisée. Ces tests lisent la migration
 * et la comparent aux constantes : modifier l'un sans l'autre fait échouer la
 * suite. Même mécanisme que `xp-parity.test.ts`, et pour la même raison : les
 * quotas avaient déjà divergé une fois, et la vitrine annonçait un volume que le
 * produit ne servait pas.
 */

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase", "migrations", "0008_kholle_quotas.sql"),
  "utf8",
);

/** Migration qui conditionne l'essai à l'identité, et pose donc le crédit. */
const TRIAL_MIGRATION = readFileSync(
  join(process.cwd(), "supabase", "migrations", "0009_trial_identity.sql"),
  "utf8",
);

type SqlLimits = Record<string, string>;

/** Extrait les affectations de chaque `update ... where plan = '<plan>'`. */
function parsePlanLimits(): Map<string, SqlLimits> {
  const blocks = new Map<string, SqlLimits>();
  const re =
    /update\s+public\.plan_limits\s+set([\s\S]*?)where\s+plan\s*=\s*'(\w+)'/g;

  let match: RegExpExecArray | null;
  while ((match = re.exec(MIGRATION)) !== null) {
    const [, body, plan] = match;
    const fields: SqlLimits = {};

    const assign = /(\w+)\s*=\s*'?([\w]+)'?/g;
    let field: RegExpExecArray | null;
    while ((field = assign.exec(body!)) !== null) {
      fields[field[1]!] = field[2]!;
    }
    blocks.set(plan!, fields);
  }
  return blocks;
}

describe("parité des offres : TypeScript ↔ migration SQL", () => {
  const sql = parsePlanLimits();

  it("la migration règle bien les deux plans", () => {
    expect([...sql.keys()].sort()).toEqual(["gratuit", "pro"]);
  });

  it("déclare exactement les mêmes plans des deux côtés", () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual([...sql.keys()].sort());
  });

  it("applique les mêmes volumes de khôlles et la même période", () => {
    for (const [tier, limits] of Object.entries(PLAN_LIMITS)) {
      const seeded = sql.get(tier);
      expect(seeded, `plan « ${tier} » absent de la migration`).toBeDefined();

      expect(Number(seeded!.kholles_per_period), `khôlles de « ${tier} »`).toBe(
        limits.kholles,
      );
      expect(seeded!.kholle_period, `période de « ${tier} »`).toBe(limits.period);
    }
  });

  it("applique les mêmes compteurs journaliers", () => {
    for (const [tier, limits] of Object.entries(PLAN_LIMITS)) {
      const seeded = sql.get(tier)!;
      expect(Number(seeded.ai_messages_day), `messages de « ${tier} »`).toBe(
        limits.aiMessagesDay,
      );
      expect(
        Number(seeded.ai_generations_day),
        `générations de « ${tier} »`,
      ).toBe(limits.aiGenerationsDay);
    }
  });

  it("offre le même nombre de khôlles de bienvenue des deux côtés", () => {
    // Le défaut de la colonne, au cas où une ligne serait créée sans valeur.
    expect(MIGRATION).toMatch(
      new RegExp(`remaining\\s+integer not null default ${KHOLLES_OFFERTES}`),
    );

    // Et surtout la valeur réellement posée à l'inscription. Elle vit dans la
    // 0009 depuis que l'essai est conditionné à l'identité : la 0008 contient
    // encore une version du trigger, mais elle est remplacée et ne s'applique
    // plus. C'est celle-ci qui fait foi.
    expect(TRIAL_MIGRATION).toMatch(
      new RegExp(`v_credits := ${KHOLLES_OFFERTES};`),
    );
  });
});

describe("les chiffres de la vitrine tiennent l'addition", () => {
  const format = KHOLLE_FORMATS.find((f) => f.id === "sciences-cours-exercice");

  it("illustre un format que le moteur sait jouer", () => {
    expect(format, "format d'exemple absent du moteur").toBeDefined();
    for (const entry of DEMO_KHOLLE_HISTORY) {
      expect(entry.formatId).toBe(format!.id);
    }
  });

  it("annonce une note globale égale à la moyenne pondérée des critères", () => {
    // Une section qui mise sur la vérifiabilité, devant des prépas qui
    // calculent des moyennes pondérées toute la journée : la première version
    // affichait 14,5 au-dessus de critères qui faisaient 13,6.
    for (const entry of DEMO_KHOLLE_HISTORY) {
      expect(
        entry.score,
        `khôlle d'exemple « ${entry.id} » : la note globale ne correspond pas aux critères`,
      ).toBe(weightedScore(entry.criteria, format!.criteria));
    }
  });

  it("montre une progression nette, sans promettre l'invraisemblable", () => {
    const first = DEMO_KHOLLE_HISTORY[0]!;
    const last = DEMO_KHOLLE_HISTORY[DEMO_KHOLLE_HISTORY.length - 1]!;

    // C'est l'écart qui vend, pas le niveau : un départ déjà bon n'aurait rien
    // à montrer.
    expect(first.score).toBeLessThanOrEqual(11);
    expect(last.score - first.score).toBeGreaterThanOrEqual(4);

    // Et un plafond crédible : un prépa sait ce que vaut un 19 en khôlle, et
    // une promesse invraisemblable décrédibilise toute la page.
    for (const entry of DEMO_KHOLLE_HISTORY) {
      for (const criterion of entry.criteria) {
        expect(criterion.score, `${entry.id} · ${criterion.criterionId}`).toBeLessThanOrEqual(17);
      }
    }
  });

  it("note chaque critère du format à chaque khôlle d'exemple", () => {
    // Un critère manquant laisserait un trou dans la courbe illustrée.
    for (const entry of DEMO_KHOLLE_HISTORY) {
      expect(entry.criteria.map((c) => c.criterionId).sort()).toEqual(
        format!.criteria.map((c) => c.id).sort(),
      );
    }
  });
});

describe("cohérence des offres", () => {
  it("donne strictement plus de khôlles au payant qu'au gratuit", () => {
    // Comparaison ramenée au mois : une allocation hebdomadaire ne se compare
    // pas directement à une allocation mensuelle.
    const perMonth = (tier: PlanTier) =>
      PLAN_LIMITS[tier].period === "week"
        ? PLAN_LIMITS[tier].kholles * 4
        : PLAN_LIMITS[tier].kholles;

    expect(perMonth("pro")).toBeGreaterThan(perMonth("gratuit"));
  });

  it("porte l'essai par les khôlles offertes, pas par une allocation", () => {
    // Le gratuit n'est plus un plan mais un essai : c'est le crédit de
    // bienvenue qui permet de se faire une idée, et lui seul.
    expect(KHOLLES_OFFERTES).toBeGreaterThanOrEqual(2);
    expect(PLAN_LIMITS.gratuit.kholles).toBe(0);
  });

  it("ne laisse au gratuit AUCUN budget d'IA récurrent", () => {
    // L'invariant du modèle : « après l'essai, il faut prendre l'abonnement ».
    // Rouvrir l'un de ces compteurs, même à 1 par jour, rendrait le coût d'un
    // compte non converti récurrent et sans plafond mensuel.
    const gratuit = PLAN_LIMITS.gratuit;
    expect(gratuit.kholles).toBe(0);
    expect(gratuit.aiMessagesDay).toBe(0);
    expect(gratuit.aiGenerationsDay).toBe(0);
  });

  it("ne présente l'essai comme renouvelable ni côté TS ni côté SQL", () => {
    // Le drapeau qui empêche l'interface d'annoncer une date de retour qui
    // n'arrivera jamais. Les deux fonctions SQL le dérivent de la même source.
    expect(renews("gratuit")).toBe(false);
    expect(renews("pro")).toBe(true);
    expect(MIGRATION).toContain("v_limit > 0");
  });

  it("couvre le rythme réel d'un prépa avec le Pro", () => {
    // Deux à trois vraies khôlles par semaine : le Pro doit passer au-dessus,
    // sinon l'élève compte ses khôlles et l'abonnement perd son sens.
    expect(PLAN_LIMITS.pro.kholles).toBeGreaterThanOrEqual(12);
  });

  it("garde des quotas journaliers utilisables sur le plan payant", () => {
    // Seul le Pro a des compteurs journaliers : l'essai n'en a aucun, et c'est
    // l'assertion précédente qui le vérifie.
    expect(PLAN_LIMITS.pro.aiMessagesDay).toBeGreaterThan(0);
    expect(PLAN_LIMITS.pro.aiGenerationsDay).toBeGreaterThan(0);
  });
});
