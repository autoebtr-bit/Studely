import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DISPOSABLE_DOMAINS } from "@/lib/auth/email";

/**
 * Parité des règles d'identité : TypeScript ↔ SQL.
 *
 * `canonicalEmail` (formulaire, retour immédiat) et `public.canonical_email`
 * (trigger d'inscription, autorité réelle) doivent appliquer les mêmes règles.
 * Si le TypeScript fusionnait plus largement que le SQL, le formulaire
 * refuserait une adresse que la base aurait acceptée — et inversement, un
 * contournement passerait.
 */

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase", "migrations", "0009_trial_identity.sql"),
  "utf8",
);

const TS = readFileSync(
  join(process.cwd(), "lib", "auth", "email.ts"),
  "utf8",
);

/** Domaines cités dans la clause `v_domain in (...)` du SQL. */
function sqlPlusAddressingDomains(): Set<string> {
  const block = /v_domain in \(([\s\S]*?)\) then/.exec(MIGRATION);
  expect(block, "clause des domaines à étiquette absente du SQL").not.toBeNull();

  return new Set(
    [...block![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!),
  );
}

/** Domaines de la constante TypeScript correspondante. */
function tsPlusAddressingDomains(): Set<string> {
  const block = /PLUS_ADDRESSING_DOMAINS = new Set\(\[([\s\S]*?)\]\)/.exec(TS);
  expect(block, "constante des domaines à étiquette absente du TS").not.toBeNull();

  return new Set([...block![1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!));
}

/** Domaines jetables semés par la migration. */
function sqlDisposableDomains(): Set<string> {
  const start = MIGRATION.indexOf("insert into public.disposable_email_domains");
  expect(start, "semis des domaines jetables absent").toBeGreaterThan(-1);

  const end = MIGRATION.indexOf("on conflict (domain)", start);
  const block = MIGRATION.slice(start, end);

  return new Set([...block.matchAll(/'([^']+)'/g)].map((m) => m[1]!));
}

describe("parité des règles d'adresse : TypeScript ↔ SQL", () => {
  it("applique l'étiquette « + » aux mêmes fournisseurs", () => {
    const sql = sqlPlusAddressingDomains();
    const ts = tsPlusAddressingDomains();

    // `googlemail.com` est traité en amont côté SQL (ramené à gmail.com) et
    // figure dans la liste TS : c'est la seule divergence admise.
    ts.delete("googlemail.com");

    expect([...ts].sort()).toEqual([...sql].sort());
  });

  it("ignore les points chez les mêmes fournisseurs", () => {
    // Une seule règle des deux côtés, et elle ne vise que Google.
    expect(MIGRATION).toContain("if v_domain = 'gmail.com' then");
    expect(MIGRATION).toContain("replace(v_local, '.', '')");
    expect(TS).toContain('DOT_INSENSITIVE_DOMAINS = new Set(["gmail.com", "googlemail.com"])');
  });

  it("ramène googlemail.com à gmail.com des deux côtés", () => {
    expect(MIGRATION).toContain("v_domain = 'googlemail.com'");
    expect(TS).toContain('"googlemail.com": "gmail.com"');
  });

  it("ne laisse le formulaire refuser aucun domaine que la base accepterait", () => {
    // Inclusion voulue dans ce sens seulement : la table SQL peut être enrichie
    // sans redéploiement, le TypeScript n'est qu'un sous-ensemble pour le
    // message immédiat.
    const sql = sqlDisposableDomains();
    for (const domain of DISPOSABLE_DOMAINS) {
      expect(
        sql.has(domain),
        `« ${domain} » est refusé côté formulaire mais absent du semis SQL`,
      ).toBe(true);
    }
  });
});

describe("l'essai ne s'accorde qu'une fois par identité", () => {
  it("mémorise l'attribution hors du cycle de vie du compte", () => {
    // Sans clé étrangère vers `profiles` : supprimer son compte et se
    // réinscrire est le contournement évident une fois les alias fermés.
    expect(MIGRATION).toContain("create table public.trial_grants");
    expect(MIGRATION).not.toMatch(
      /create table public\.trial_grants[\s\S]*?references public\.profiles/,
    );
  });

  it("n'accorde le crédit que si l'insertion a réellement eu lieu", () => {
    // `on conflict do nothing` puis `if found` : deux inscriptions simultanées
    // sur la même identité ne peuvent pas obtenir l'essai chacune de leur côté.
    expect(MIGRATION).toContain("on conflict (email_canonical) do nothing");
    expect(MIGRATION).toContain("if found then");
  });

  it("laisse l'inscription aboutir même sans essai", () => {
    // On n'ajoute pas de `raise exception` : un faux positif ne doit pas
    // fermer la porte, l'élève doit pouvoir voir le produit et s'abonner.
    expect(MIGRATION).not.toContain("raise exception");
  });
});
