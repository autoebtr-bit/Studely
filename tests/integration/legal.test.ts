import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FOOTER_COLUMNS } from "@/lib/marketing/content";

/**
 * Obligations légales du site — ce qui doit rester vert en permanence.
 *
 * Couvre une panne déjà présente : **des liens du pied de page menaient à des
 * pages inexistantes.** « Politique de confidentialité » renvoyait vers un 404,
 * ce qui est pire que l'absence de lien — cela donne l'apparence d'une
 * conformité sans en avoir la substance.
 *
 * L'identité de l'éditeur, elle, est vérifiée à part, dans
 * `tests/launch/legal-identity.test.ts` : elle ne peut pas être devinée et
 * reste rouge jusqu'au remplissage. La laisser ici rendrait la suite
 * durablement rouge, et le rouge cesserait d'être un signal.
 */

const ROOT = process.cwd();

/** Chemins des pages existantes sous `app/`, en URL. */
function existingRoutes(): Set<string> {
  const routes = new Set<string>();

  function walk(dir: string, url: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        if (entry.name === "page.tsx") routes.add(url === "" ? "/" : url);
        continue;
      }
      // Les groupes `(marketing)` et `(app)` n'apparaissent pas dans l'URL.
      const segment = entry.name.startsWith("(") ? "" : `/${entry.name}`;
      walk(join(dir, entry.name), url + segment);
    }
  }

  walk(join(ROOT, "app"), "");
  return routes;
}

const ROUTES = existingRoutes();

/** Liens internes du pied de page, ancres exclues. */
const FOOTER_LINKS = FOOTER_COLUMNS.flatMap((column) =>
  column.links.map((link) => link.href),
).filter((href) => href.startsWith("/"));

/** Chemins déclarés publics dans le middleware, hors routes d'API. */
function publicPrefixes(): string[] {
  const source = readFileSync(
    join(ROOT, "lib", "supabase", "middleware.ts"),
    "utf8",
  );

  const bloc = source.slice(
    source.indexOf("const PUBLIC_PREFIXES"),
    source.indexOf("const GUEST_ONLY"),
  );

  return [...bloc.matchAll(/"(\/[^"]*)"/g)]
    .map((m) => m[1]!)
    // Les routes d'API n'ont pas de page, et `/auth` n'expose qu'un callback.
    .filter((p) => !p.startsWith("/api/") && p !== "/auth");
}

describe("chemins publics du middleware", () => {
  const PREFIXES = publicPrefixes();

  it("en trouve plusieurs", () => {
    // Garde-fou : si l'extraction cesse de fonctionner, le test passerait au
    // vert en ne vérifiant plus rien.
    expect(PREFIXES.length).toBeGreaterThanOrEqual(4);
  });

  /**
   * Laisser passer un visiteur vers une page inexistante est pire qu'un simple
   * oubli : `/tarifs` était autorisée sans exister, et c'est précisément
   * l'adresse qu'on partage quand on parle du prix. Chaque visiteur non
   * connecté y trouvait un 404.
   */
  it.each(PREFIXES)("%s a bien une page", (prefix) => {
    expect(ROUTES.has(prefix), `${prefix} est publique mais n'existe pas`).toBe(
      true,
    );
  });
});

describe("liens du pied de page", () => {
  it("en contient au moins un vers une page légale", () => {
    // Garde-fou du test : sans cette assertion, retirer tous les liens le
    // ferait passer au vert.
    expect(FOOTER_LINKS.length).toBeGreaterThan(0);
  });

  it.each(FOOTER_LINKS)("%s existe", (href) => {
    expect(ROUTES.has(href), `${href} mène à un 404`).toBe(true);
  });
});

describe("pages légales obligatoires", () => {
  const OBLIGATOIRES = ["/mentions-legales", "/confidentialite", "/cgv"];

  it.each(OBLIGATOIRES)("%s existe", (route) => {
    expect(ROUTES.has(route)).toBe(true);
  });

  it("les pages légales sont publiques dans le middleware", () => {
    // Sans cela, un visiteur non connecté serait redirigé vers la connexion
    // pour lire une page qui doit précisément être consultable sans compte —
    // les conditions de vente doivent notamment être lisibles AVANT d'acheter.
    const middleware = readFileSync(
      join(ROOT, "lib", "supabase", "middleware.ts"),
      "utf8",
    );

    for (const route of OBLIGATOIRES) {
      expect(middleware, `${route} n'est pas publique`).toContain(`"${route}"`);
    }
  });

  it("le webhook de paiement échappe à l'authentification", () => {
    // Il est appelé par les serveurs de Stripe, sans aucune session : le
    // protéger par l'authentification l'empêcherait de fonctionner, et les
    // abonnements payés ne seraient jamais enregistrés. Sa protection est la
    // signature cryptographique, vérifiée dans la route elle-même.
    const middleware = readFileSync(
      join(ROOT, "lib", "supabase", "middleware.ts"),
      "utf8",
    );

    expect(middleware).toContain('"/api/billing/webhook"');
  });
});
