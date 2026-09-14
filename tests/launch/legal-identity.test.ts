import { describe, expect, it } from "vitest";
import { A_COMPLETER, LEGAL_ENTITY } from "@/lib/legal/entity";

/**
 * Contrôle de pré-lancement — **rouge tant que le site n'est pas prêt à ouvrir.**
 *
 * Ne fait pas partie de `npm run test` : il échoue par construction aujourd'hui,
 * et une suite durablement rouge cesse d'être lue. Il se lance par
 * `npm run check:launch`, à faire avant la première mise en ligne.
 *
 * Ce qu'il vérifie ne peut pas être deviné : dénomination, SIRET, adresse du
 * siège, directeur de la publication, hébergeur. Seul l'exploitant du site les
 * connaît. **Les inventer serait une fausse déclaration** — bien plus grave que
 * l'absence momentanée de la page. D'où un champ vide assumé, et ce test pour
 * qu'il ne passe pas inaperçu.
 *
 * Pour le faire passer : renseigner `lib/legal/entity.ts`.
 */
describe("identité de l'éditeur", () => {
  const champs = Object.entries(LEGAL_ENTITY).filter(
    ([, value]) => typeof value === "string",
  );

  it("énumère bien les champs à contrôler", () => {
    // Sans cela, vider l'objet ferait passer le contrôle au vert.
    expect(champs.length).toBeGreaterThanOrEqual(9);
  });

  it.each(champs)("%s est renseigné", (nom, value) => {
    expect(
      value,
      `« ${nom} » vaut encore ${A_COMPLETER}. Renseigne-le dans ` +
        "lib/legal/entity.ts avant la mise en ligne. Ne jamais l'inventer : " +
        "une mention légale fausse expose davantage qu'une mention absente.",
    ).not.toBe(A_COMPLETER);
  });
});
