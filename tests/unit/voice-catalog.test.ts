import { describe, expect, it } from "vitest";
import {
  pickBestFrenchVoice,
  prettyVoiceName,
  rankFrenchVoices,
  scoreVoice,
  voiceQuality,
  type VoiceLike,
} from "@/lib/voice/voice-catalog";

/** Raccourci de construction d'une voix de test. */
const v = (name: string, lang = "fr-FR", localService = true): VoiceLike => ({
  name,
  lang,
  localService,
});

/** Catalogue réaliste d'un poste Windows avec Chrome installé. */
const WINDOWS_CHROME: VoiceLike[] = [
  v("Microsoft Hortense Desktop - French"),
  v("Microsoft Paul Desktop - French"),
  v("Google français", "fr-FR", false),
  v("Microsoft Zira Desktop - English (United States)", "en-US"),
];

describe("scoreVoice", () => {
  it("écarte les voix qui ne sont pas en français", () => {
    expect(scoreVoice(v("Microsoft Zira", "en-US"))).toBeNull();
    expect(scoreVoice(v("Alice", "it-IT"))).toBeNull();
  });

  it("accepte les autres variantes de français, en les plaçant après fr-FR", () => {
    const france = scoreVoice(v("Voix neutre", "fr-FR"));
    const canada = scoreVoice(v("Voix neutre", "fr-CA"));
    expect(france).not.toBeNull();
    expect(canada).not.toBeNull();
    expect(france!).toBeGreaterThan(canada!);
  });

  it("classe la voix robotique de Windows sous une voix quelconque", () => {
    const hortense = scoreVoice(v("Microsoft Hortense Desktop - French"))!;
    const neutre = scoreVoice(v("Voix inconnue"))!;
    expect(hortense).toBeLessThan(neutre);
  });

  it("pénalise les voix masculines", () => {
    const feminine = scoreVoice(v("Audrey"))!;
    const masculine = scoreVoice(v("Thomas"))!;
    expect(masculine).toBeLessThan(feminine);
  });

  it("valorise les voix neuronales modernes", () => {
    const natural = scoreVoice(v("Microsoft Denise Online (Natural) - French (France)"))!;
    const legacy = scoreVoice(v("Microsoft Denise Desktop - French"))!;
    expect(natural).toBeGreaterThan(legacy);
  });

  it("tolère un code de langue au format système (fr_FR)", () => {
    expect(scoreVoice(v("Amélie", "fr_FR"))).not.toBeNull();
  });
});

describe("rankFrenchVoices", () => {
  it("ne retient que le français", () => {
    const ranked = rankFrenchVoices(WINDOWS_CHROME);
    expect(ranked).toHaveLength(3);
    expect(ranked.every((voice) => voice.lang.startsWith("fr"))).toBe(true);
  });

  it("est déterministe à score égal", () => {
    const a = rankFrenchVoices([v("Béatrice"), v("Adeline")]);
    const b = rankFrenchVoices([v("Adeline"), v("Béatrice")]);
    expect(a.map((x) => x.name)).toEqual(b.map((x) => x.name));
  });

  it("renvoie une liste vide sans voix française", () => {
    expect(rankFrenchVoices([v("Zira", "en-US")])).toEqual([]);
  });
});

describe("pickBestFrenchVoice", () => {
  it("préfère Google français à la voix SAPI historique", () => {
    expect(pickBestFrenchVoice(WINDOWS_CHROME)?.name).toBe("Google français");
  });

  it("préfère une voix neuronale Edge quand Chrome n'est pas là", () => {
    const edge = [
      v("Microsoft Hortense Desktop - French"),
      v("Microsoft Henri Online (Natural) - French (France)", "fr-FR", false),
      v("Microsoft Denise Online (Natural) - French (France)", "fr-FR", false),
    ];
    expect(pickBestFrenchVoice(edge)?.name).toContain("Denise");
  });

  it("choisit une voix féminine premium sur macOS", () => {
    const mac = [v("Thomas"), v("Audrey"), v("Marie")];
    const best = pickBestFrenchVoice(mac)?.name;
    expect(["Audrey", "Marie"]).toContain(best);
  });

  it("renvoie null si aucune voix française n'est installée", () => {
    expect(pickBestFrenchVoice([v("Zira", "en-US")])).toBeNull();
  });

  it("ne plante pas sur une liste vide", () => {
    expect(pickBestFrenchVoice([])).toBeNull();
  });
});

describe("voiceQuality", () => {
  it("reconnaît les voix neuronales", () => {
    expect(voiceQuality(v("Microsoft Denise Online (Natural) - French (France)"))).toBe(
      "naturelle",
    );
    expect(voiceQuality(v("Google français", "fr-FR", false))).toBe("naturelle");
  });

  it("classe les voix système historiques comme anciennes", () => {
    expect(voiceQuality(v("Microsoft Hortense - French (France)"))).toBe("ancienne");
    expect(voiceQuality(v("Microsoft Julie - French (France)"))).toBe("ancienne");
    expect(voiceQuality(v("Microsoft Denise Desktop - French"))).toBe("ancienne");
  });

  it("classe toute voix Microsoft embarquée non neuronale comme ancienne", () => {
    // « Paul » n'est dans aucune liste de voix métalliques, mais c'est bien
    // une voix SAPI historique : le préfixe Microsoft suffit à trancher.
    expect(voiceQuality(v("Microsoft Paul - French (France)"))).toBe("ancienne");
  });

  it("ne dégrade pas une voix Microsoft neuronale", () => {
    expect(
      voiceQuality(v("Microsoft Vivienne Online (Natural) - French (France)", "fr-FR", false)),
    ).toBe("naturelle");
  });

  it("laisse les voix système non Microsoft en qualité standard", () => {
    expect(voiceQuality(v("Voix inconnue"))).toBe("standard");
    expect(voiceQuality(v("Audrey"))).toBe("standard");
  });

  it("n'est pas trompée par la casse du libellé", () => {
    expect(voiceQuality(v("MICROSOFT HORTENSE - FRENCH"))).toBe("ancienne");
  });
});

describe("prettyVoiceName", () => {
  it("retire le bruit technique des libellés système", () => {
    expect(
      prettyVoiceName(v("Microsoft Denise Online (Natural) - French (France)")),
    ).toBe("Denise");
    expect(prettyVoiceName(v("Microsoft Hortense Desktop - French"))).toBe(
      "Hortense",
    );
  });

  it("laisse intact un nom déjà propre", () => {
    expect(prettyVoiceName(v("Audrey"))).toBe("Audrey");
    expect(prettyVoiceName(v("Google français"))).toBe("Google français");
  });
});
