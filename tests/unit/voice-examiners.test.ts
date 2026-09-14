import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXAMINER_ID,
  DEFAULT_EXAMINER_NAME,
  EXAMINERS,
  getExaminer,
} from "@/lib/voice/examiners";
import {
  pickBestFrenchVoice,
  rankFrenchVoices,
  scoreVoice,
  type VoiceLike,
} from "@/lib/voice/voice-catalog";

const v = (name: string, lang = "fr-FR", localService = true): VoiceLike => ({
  name,
  lang,
  localService,
});

describe("les khôlleurs", () => {
  it("propose exactement deux choix", () => {
    // Le produit promet « une voix de femme ou une voix d'homme », pas un
    // catalogue de réglages : ce test verrouille cette promesse.
    expect(EXAMINERS).toHaveLength(2);
  });

  it("couvre un genre de voix par personnage", () => {
    expect(EXAMINERS.map((e) => e.prefer).sort()).toEqual([
      "feminine",
      "masculine",
    ]);
  });

  it("n'a aucun identifiant en double", () => {
    const ids = EXAMINERS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("donne un prénom à chacun, pas un nom de réglage", () => {
    for (const examiner of EXAMINERS) {
      expect(examiner.name, examiner.id).toMatch(/^\p{Lu}\p{L}+$/u);
      // Le génitif sert aux titres (« la fiche d'Hélène ») et doit contenir
      // le prénom, sinon l'élision a été écrite à côté.
      expect(examiner.possessive, examiner.id).toContain(examiner.name);
    }
  });

  it("propose par défaut une voix féminine posée", () => {
    const preset = getExaminer(DEFAULT_EXAMINER_ID);
    expect(preset.prefer).toBe("feminine");
    // Un débit sous la normale : c'est lui qui adoucit la diction.
    expect(preset.rate).toBeLessThan(1);
    expect(DEFAULT_EXAMINER_NAME).toBe(preset.name);
  });

  it("garde des débits audibles", () => {
    for (const examiner of EXAMINERS) {
      expect(examiner.rate, examiner.id).toBeGreaterThanOrEqual(0.7);
      expect(examiner.rate, examiner.id).toBeLessThanOrEqual(1.3);
    }
  });

  it("ne déforme jamais la hauteur au point de caricaturer la voix", () => {
    // Au-delà de ±0,08 le rendu devient comique, donc agaçant.
    for (const examiner of EXAMINERS) {
      expect(Math.abs(examiner.pitch - 1), examiner.id).toBeLessThanOrEqual(0.08);
    }
  });

  it("décrit chaque khôlleur pour qu'on puisse choisir sans écouter", () => {
    for (const examiner of EXAMINERS) {
      expect(examiner.description.length, examiner.id).toBeGreaterThan(30);
      expect(examiner.temperament.length, examiner.id).toBeGreaterThan(4);
    }
  });

  it("retombe sur le khôlleur par défaut pour un identifiant inconnu", () => {
    expect(getExaminer("inexistant").id).toBe(DEFAULT_EXAMINER_ID);
    expect(getExaminer(null).id).toBe(DEFAULT_EXAMINER_ID);
    expect(getExaminer(undefined).id).toBe(DEFAULT_EXAMINER_ID);
  });
});

describe("classement orienté par genre", () => {
  const machine = [v("Audrey"), v("Thomas"), v("Marie")];

  it("privilégie une voix féminine par défaut", () => {
    expect(["Audrey", "Marie"]).toContain(pickBestFrenchVoice(machine)?.name);
  });

  it("retient une voix masculine quand le khôlleur la demande", () => {
    expect(pickBestFrenchVoice(machine, "masculine")?.name).toBe("Thomas");
  });

  it("reste utilisable quand le genre demandé n'existe pas", () => {
    // Une machine sans voix masculine doit tout de même produire un résultat :
    // Vincent abaissera la hauteur d'une voix féminine.
    const feminineOnly = [v("Audrey"), v("Marie")];
    expect(pickBestFrenchVoice(feminineOnly, "masculine")).not.toBeNull();
  });

  it("n'écarte jamais une voix à cause du genre", () => {
    for (const prefer of ["feminine", "masculine", "any"] as const) {
      expect(rankFrenchVoices(machine, prefer)).toHaveLength(machine.length);
    }
  });

  it("ne pénalise aucun genre en mode neutre", () => {
    const feminine = scoreVoice(v("Audrey"), "any")!;
    const masculine = scoreVoice(v("Thomas"), "any")!;
    // Audrey reste devant par sa qualité connue, mais l'écart ne vient pas
    // d'une pénalité de genre.
    expect(masculine).toBeGreaterThan(scoreVoice(v("Thomas"), "feminine")!);
    expect(feminine).toBeGreaterThan(masculine);
  });

  it("continue de placer une voix neuronale devant une voix système", () => {
    const mixed = [
      v("Microsoft Hortense - French (France)"),
      v("Microsoft Denise Online (Natural) - French (France)", "fr-FR", false),
    ];
    expect(pickBestFrenchVoice(mixed)?.name).toContain("Denise");
  });
});
