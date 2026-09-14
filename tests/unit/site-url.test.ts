import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site-url";

/**
 * Résolution de l'adresse publique du site.
 *
 * Ce test existe parce que le premier déploiement a échoué là-dessus, et de la
 * façon la plus coûteuse : pas une page cassée, mais **le build entier refusé**,
 * sur une seule ligne du gabarit racine.
 *
 *     TypeError: Invalid URL … input: ''
 *
 * La cause était un `??` là où il fallait tester le contenu : une variable
 * déclarée mais laissée vide vaut `""`, pas `undefined`. `??` la laisse donc
 * passer telle quelle, et `new URL("")` lève.
 */

const VARS = [
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(VARS.map((v) => [v, process.env[v]]));
  for (const v of VARS) delete process.env[v];
});

afterEach(() => {
  for (const v of VARS) {
    if (saved[v] === undefined) delete process.env[v];
    else process.env[v] = saved[v];
  }
});

describe("siteUrl", () => {
  it("retombe sur localhost quand rien n'est défini", () => {
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it.each(VARS)("ne renvoie jamais de chaîne vide quand %s est vide", (v) => {
    // Le cas exact qui a cassé le déploiement.
    process.env[v] = "";
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("ignore une valeur qui n'est que des espaces", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    expect(siteUrl()).toBe("http://localhost:3000");
  });

  it("préfère la valeur explicite à tout le reste", () => {
    // Un domaine acheté ne change pas, contrairement aux adresses attribuées
    // par l'hébergeur : il doit donc l'emporter.
    process.env.NEXT_PUBLIC_SITE_URL = "https://studely.fr";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "studely.vercel.app";
    process.env.VERCEL_URL = "studely-abc123.vercel.app";

    expect(siteUrl()).toBe("https://studely.fr");
  });

  it("retire la barre oblique finale", () => {
    // Sans cela, les URL construites porteraient un double « // ».
    process.env.NEXT_PUBLIC_SITE_URL = "https://studely.fr/";
    expect(siteUrl()).toBe("https://studely.fr");
  });

  it("utilise le domaine de production de l'hébergeur à défaut", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "studely.vercel.app";
    process.env.VERCEL_URL = "studely-abc123.vercel.app";

    // Stable d'un déploiement à l'autre, contrairement à `VERCEL_URL`.
    expect(siteUrl()).toBe("https://studely.vercel.app");
  });

  it("utilise l'adresse du déploiement en dernier recours", () => {
    process.env.VERCEL_URL = "studely-abc123.vercel.app";
    expect(siteUrl()).toBe("https://studely-abc123.vercel.app");
  });

  it("produit toujours une URL que `new URL` accepte", () => {
    // C'est la propriété qui compte vraiment : le build en dépend.
    for (const value of ["", "   ", "https://studely.fr"]) {
      process.env.NEXT_PUBLIC_SITE_URL = value;
      expect(() => new URL(siteUrl())).not.toThrow();
    }
  });
});
