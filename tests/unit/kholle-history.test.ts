import { describe, expect, it } from "vitest";
import {
  MAX_SCORE,
  formatScore,
  progression,
  scoresFor,
  trendPoints,
  weakestCriterion,
  weightedScore,
  type KholleHistoryEntry,
} from "@/lib/kholle/history";

const entry = (
  id: string,
  scores: Record<string, number>,
): KholleHistoryEntry => ({
  id,
  formatId: "sciences-cours-exercice",
  score: 12,
  date: "2026-09-16",
  criteria: Object.entries(scores).map(([criterionId, score]) => ({
    criterionId,
    score,
  })),
});

describe("placement des points sur la courbe", () => {
  it("place 0 en bas et 20 en haut", () => {
    const [zero, max] = trendPoints([0, MAX_SCORE]);
    expect(zero!.y).toBe(100);
    expect(max!.y).toBe(0);
  });

  it("garde l'échelle complète, sans cadrer sur les valeurs", () => {
    // Trois notes resserrées doivent rester resserrées : un axe qui démarrerait
    // à 12 ferait passer deux points de mieux pour un bond.
    const points = trendPoints([12, 13, 14]);
    const ys = points.map((p) => p.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(15);
  });

  it("répartit les points de gauche à droite dans l'ordre des séances", () => {
    const points = trendPoints([8, 12, 16, 10]);
    expect(points.map((p) => p.x)).toEqual([0, 100 / 3, 200 / 3, 100]);
    expect(points.map((p) => p.score)).toEqual([8, 12, 16, 10]);
    expect(points.map((p) => p.label)).toEqual(["K1", "K2", "K3", "K4"]);
  });

  it("centre une séance unique au lieu de la coller à gauche", () => {
    // Une « courbe » d'un seul point n'existe pas ; à gauche, elle donnerait
    // l'illusion d'un début de pente.
    const points = trendPoints([15]);
    expect(points).toHaveLength(1);
    expect(points[0]!.x).toBe(50);
  });

  it("ne dessine rien sans séance", () => {
    expect(trendPoints([])).toEqual([]);
  });

  it("borne une note aberrante au lieu de sortir du cadre", () => {
    const [under, over] = trendPoints([-4, 25]);
    expect(under!.y).toBe(100);
    expect(over!.y).toBe(0);
  });
});

describe("choix du critère mis en avant", () => {
  const history = [
    entry("a", { exactitude: 14, rigueur: 9, initiative: 12 }),
    entry("b", { exactitude: 16, rigueur: 10, initiative: 11 }),
  ];
  const ids = ["exactitude", "rigueur", "initiative"];

  it("ouvre sur le critère le plus faible en moyenne", () => {
    // Celui qui a besoin d'être regardé. Ouvrir sur le meilleur flatterait
    // sans rien apprendre.
    expect(weakestCriterion(history, ids)).toBe("rigueur");
  });

  it("ne choisit rien sans historique", () => {
    expect(weakestCriterion([], ids)).toBeNull();
  });

  it("retombe sur le premier critère si aucun n'a été noté", () => {
    expect(weakestCriterion(history, ["inconnu"])).toBe("inconnu");
  });
});

describe("notes d'un critère", () => {
  const history = [
    entry("a", { exactitude: 11, rigueur: 10 }),
    entry("b", { rigueur: 12 }),
    entry("c", { exactitude: 16, rigueur: 13 }),
  ];

  it("suit l'ordre des séances et ignore celles où le critère manque", () => {
    expect(scoresFor(history, "exactitude")).toEqual([11, 16]);
  });

  it("renvoie une liste vide pour un critère inconnu", () => {
    expect(scoresFor(history, "inexistant")).toEqual([]);
  });
});

describe("note globale calculée depuis les critères", () => {
  const weights = [
    { id: "exactitude", weight: 30 },
    { id: "rigueur", weight: 25 },
    { id: "initiative", weight: 25 },
    { id: "reaction", weight: 20 },
  ];

  it("applique bien la pondération du barème", () => {
    // 16×30 + 13×25 + 11×25 + 14×20 = 1360 ; sur 100, cela fait 13,6 → 13,5
    // au demi-point. La valeur écrite à la main disait 14,5.
    const entries = [
      { criterionId: "exactitude", score: 16 },
      { criterionId: "rigueur", score: 13 },
      { criterionId: "initiative", score: 11 },
      { criterionId: "reaction", score: 14 },
    ];
    expect(weightedScore(entries, weights)).toBe(13.5);
  });

  it("arrondit au demi-point, comme une vraie note", () => {
    const entries = weights.map((w) => ({ criterionId: w.id, score: 12.4 }));
    expect(weightedScore(entries, weights)).toBe(12.5);
  });

  it("normalise sur les critères réellement notés", () => {
    // Un critère manquant ne doit pas tirer la note vers le bas : elle porte
    // sur ce qui a été évalué.
    const entries = [{ criterionId: "exactitude", score: 14 }];
    expect(weightedScore(entries, weights)).toBe(14);
  });

  it("ne renvoie rien quand aucun critère n'est noté", () => {
    expect(weightedScore([], weights)).toBeNull();
    expect(weightedScore([{ criterionId: "inconnu", score: 18 }], weights)).toBeNull();
  });

  it("borne les notes aberrantes au lieu de sortir de l'échelle", () => {
    const entries = weights.map((w) => ({ criterionId: w.id, score: 99 }));
    expect(weightedScore(entries, weights)).toBe(MAX_SCORE);
  });
});

describe("écriture d'une note", () => {
  it("écrit les demi-points à la française", () => {
    // La même note apparaissait en « 14.5 » dans un en-tête et « 14,5 » deux
    // lignes plus bas : trois composants recopiaient ce formatage.
    expect(formatScore(14.5)).toBe("14,5");
  });

  it("n'ajoute pas de décimale inutile", () => {
    expect(formatScore(16)).toBe("16");
    expect(formatScore(0)).toBe("0");
  });
});

describe("écart depuis la première khôlle", () => {
  it("compte la différence entre la première et la dernière", () => {
    expect(progression([11, 13, 12, 16])).toBe(5);
    expect(progression([14, 11])).toBe(-3);
  });

  it("n'annonce aucun écart avec une seule séance", () => {
    // Il n'y a rien à comparer : afficher « +0 » suggérerait une stagnation.
    expect(progression([15])).toBeNull();
    expect(progression([])).toBeNull();
  });

  it("arrondit au dixième, comme les demi-points d'une khôlle", () => {
    expect(progression([10.5, 13.25])).toBe(2.8);
  });
});
