import { describe, expect, it } from "vitest";
import {
  KHOLLE_FORMATS,
  allFilieres,
  formatsForDiscipline,
  getFormat,
  playablePhases,
} from "@/lib/kholle/formats";

/**
 * Les formats sont des données, et le moteur leur fait confiance : une somme de
 * pondérations fausse produirait silencieusement une note fausse. Ces tests
 * verrouillent les invariants qu'aucun compilateur ne peut vérifier.
 */

describe("intégrité du catalogue", () => {
  it("expose au moins un format par grande famille de filières", () => {
    expect(KHOLLE_FORMATS.length).toBeGreaterThanOrEqual(5);
  });

  it("n'a aucun identifiant en double", () => {
    const ids = KHOLLE_FORMATS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("nomme au moins une filière par format", () => {
    for (const format of KHOLLE_FORMATS) {
      expect(format.filieres.length, format.id).toBeGreaterThan(0);
    }
  });

  it("donne une consigne d'examinateur substantielle à chaque format", () => {
    for (const format of KHOLLE_FORMATS) {
      // Une consigne courte produirait un examinateur générique, donc inutile.
      expect(format.examinerBrief.length, format.id).toBeGreaterThan(120);
    }
  });
});

describe("pondérations", () => {
  it("répartit exactement 100 % entre les phases jouées", () => {
    for (const format of KHOLLE_FORMATS) {
      const total = format.phases.reduce((sum, p) => sum + p.weight, 0);
      expect(total, `phases de ${format.id}`).toBe(100);
    }
  });

  it("répartit exactement 100 % entre les critères", () => {
    for (const format of KHOLLE_FORMATS) {
      const total = format.criteria.reduce((sum, c) => sum + c.weight, 0);
      expect(total, `critères de ${format.id}`).toBe(100);
    }
  });

  it("ne donne jamais de poids à une phase non jouée", () => {
    // Une phase de préparation dure zéro minute côté simulation : elle ne peut
    // pas peser dans la note.
    for (const format of KHOLLE_FORMATS) {
      for (const phase of format.phases) {
        if (phase.minutes === 0) {
          expect(phase.weight, `${format.id}/${phase.id}`).toBe(0);
        }
      }
    }
  });
});

describe("durées", () => {
  it("fait correspondre la somme des phases à la durée annoncée", () => {
    for (const format of KHOLLE_FORMATS) {
      const total = format.phases.reduce((sum, p) => sum + p.minutes, 0);
      expect(total, format.id).toBe(format.totalMinutes);
    }
  });

  it("garde des durées réalistes pour une khôlle", () => {
    for (const format of KHOLLE_FORMATS) {
      expect(format.totalMinutes, format.id).toBeGreaterThanOrEqual(15);
      expect(format.totalMinutes, format.id).toBeLessThanOrEqual(60);
    }
  });
});

describe("déroulé", () => {
  it("prévoit au moins une phase où l'examinateur relance", () => {
    // Sans relance, ce n'est plus une khôlle mais une récitation.
    for (const format of KHOLLE_FORMATS) {
      expect(
        format.phases.some((p) => p.interruptive),
        format.id,
      ).toBe(true);
    }
  });

  it("écarte les phases de durée nulle du déroulé jouable", () => {
    for (const format of KHOLLE_FORMATS) {
      expect(playablePhases(format).every((p) => p.minutes > 0)).toBe(true);
    }
  });

  it("conserve l'ordre déclaré des phases", () => {
    const sciences = getFormat("sciences-cours-exercice");
    expect(sciences?.phases.map((p) => p.id)).toEqual(["cours", "exercice"]);
  });
});

describe("recherche", () => {
  it("retrouve un format par son identifiant", () => {
    expect(getFormat("sciences-cours-exercice")?.discipline).toBe("maths");
  });

  it("renvoie undefined pour un identifiant inconnu", () => {
    expect(getFormat("format-inexistant")).toBeUndefined();
  });

  it("filtre par discipline", () => {
    const maths = formatsForDiscipline("maths");
    expect(maths.length).toBeGreaterThan(0);
    expect(maths.every((f) => f.discipline === "maths")).toBe(true);
  });

  it("dédoublonne les filières et les trie", () => {
    const filieres = allFilieres();
    expect(new Set(filieres).size).toBe(filieres.length);
    expect([...filieres].sort()).toEqual(filieres);
    expect(filieres).toContain("MPSI");
  });
});

describe("prédictibilité", () => {
  it("marque les disciplines scientifiques comme prédictibles", () => {
    // C'est là que les questions de cours sont énumérables à partir du
    // programme : la promesse « on sait ce qui tombe » ne vaut que pour elles.
    expect(getFormat("sciences-cours-exercice")?.predictable).toBe(true);
    expect(getFormat("sciences-physique")?.predictable).toBe(true);
  });

  it("ne la promet pas là où elle n'existe pas", () => {
    expect(getFormat("ecg-expose")?.predictable).toBe(false);
    expect(getFormat("grand-oral")?.predictable).toBe(false);
  });
});
