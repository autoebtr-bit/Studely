import { describe, expect, it } from "vitest";
import {
  MAX_LEVEL,
  buildLevelTable,
  cumulativeXpForLevel,
  levelFromXp,
  levelProgress,
  titleForLevel,
} from "@/lib/xp/level";
import { XP_RULES, computeXpAward, xpIdempotencyKey } from "@/lib/xp/rules";

describe("cumulativeXpForLevel", () => {
  it("suit la courbe annoncée", () => {
    expect(cumulativeXpForLevel(1)).toBe(0);
    expect(cumulativeXpForLevel(2)).toBe(100);
    expect(cumulativeXpForLevel(3)).toBe(300);
    expect(cumulativeXpForLevel(4)).toBe(600);
    expect(cumulativeXpForLevel(5)).toBe(1000);
    expect(cumulativeXpForLevel(6)).toBe(1500);
  });

  it("est strictement croissante", () => {
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(cumulativeXpForLevel(l)).toBeGreaterThan(cumulativeXpForLevel(l - 1));
    }
  });
});

describe("levelFromXp", () => {
  it("démarre au niveau 1", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
  });

  it("passe au niveau suivant exactement au seuil", () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(299)).toBe(2);
    expect(levelFromXp(300)).toBe(3);
  });

  it("est cohérente avec la courbe sur toute la plage", () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const floor = cumulativeXpForLevel(l);
      expect(levelFromXp(floor)).toBe(l);
      if (l > 1) expect(levelFromXp(floor - 1)).toBe(l - 1);
    }
  });

  it("absorbe les entrées aberrantes sans planter", () => {
    expect(levelFromXp(-500)).toBe(1);
    expect(levelFromXp(Number.NaN)).toBe(1);
    expect(levelFromXp(Number.POSITIVE_INFINITY)).toBe(MAX_LEVEL);
  });

  it("plafonne au niveau maximum", () => {
    expect(levelFromXp(999_999_999)).toBe(MAX_LEVEL);
  });
});

describe("levelProgress", () => {
  it("décompose correctement une XP en cours de niveau", () => {
    // 1240 XP : niveau 5 (seuil 1000), il reste 260 XP sur les 500 du niveau.
    const p = levelProgress(1240);
    expect(p.level).toBe(5);
    expect(p.xpIntoLevel).toBe(240);
    expect(p.xpForNextLevel).toBe(500);
    expect(p.pct).toBeCloseTo(48, 5);
    expect(p.isMaxLevel).toBe(false);
  });

  it("garde le pourcentage entre 0 et 100", () => {
    for (const xp of [0, 1, 99, 100, 1234, 50_000]) {
      const p = levelProgress(xp);
      expect(p.pct).toBeGreaterThanOrEqual(0);
      expect(p.pct).toBeLessThanOrEqual(100);
    }
  });

  it("signale le niveau maximum", () => {
    const p = levelProgress(cumulativeXpForLevel(MAX_LEVEL));
    expect(p.isMaxLevel).toBe(true);
    expect(p.xpForNextLevel).toBeNull();
    expect(p.pct).toBe(100);
  });
});

describe("titleForLevel", () => {
  it("attribue le palier atteint le plus élevé", () => {
    expect(titleForLevel(1)).toBe("Novice");
    expect(titleForLevel(2)).toBe("Novice");
    expect(titleForLevel(3)).toBe("Apprenti");
    expect(titleForLevel(5)).toBe("Assidu");
    expect(titleForLevel(19)).toBe("Maître");
    expect(titleForLevel(20)).toBe("Légende");
    expect(titleForLevel(60)).toBe("Légende");
  });
});

describe("buildLevelTable", () => {
  it("produit une table complète prête à seeder", () => {
    const table = buildLevelTable();
    expect(table).toHaveLength(MAX_LEVEL);
    expect(table[0]).toEqual({ level: 1, xp_required: 0, title: "Novice" });
    expect(table.at(-1)?.level).toBe(MAX_LEVEL);
  });
});

describe("computeXpAward", () => {
  it("renvoie le gain de base pour un événement simple", () => {
    expect(computeXpAward("lesson_completed")).toBe(50);
    expect(computeXpAward("flashcard_review")).toBe(2);
  });

  it("ajoute un bonus proportionnel à la note d'une colle orale", () => {
    expect(computeXpAward("oral_session_completed", { score20: 0 })).toBe(40);
    expect(computeXpAward("oral_session_completed", { score20: 10 })).toBe(50);
    expect(computeXpAward("oral_session_completed", { score20: 20 })).toBe(60);
  });

  it("borne le bonus d'oral même si la note est hors barème", () => {
    expect(computeXpAward("oral_session_completed", { score20: 99 })).toBe(60);
    expect(computeXpAward("oral_session_completed", { score20: -5 })).toBe(40);
  });

  it("fait croître la récompense de série puis la plafonne à 7 jours", () => {
    expect(computeXpAward("daily_streak", { streakDays: 1 })).toBe(10);
    expect(computeXpAward("daily_streak", { streakDays: 5 })).toBe(50);
    expect(computeXpAward("daily_streak", { streakDays: 7 })).toBe(70);
    expect(computeXpAward("daily_streak", { streakDays: 300 })).toBe(70);
  });

  it("ne dépasse jamais le plafond journalier annoncé pour un seul événement", () => {
    for (const rule of Object.values(XP_RULES)) {
      if (rule.dailyCap === null) continue;
      const award = computeXpAward(rule.kind, { score20: 20, streakDays: 7 });
      expect(award).toBeLessThanOrEqual(rule.dailyCap);
    }
  });
});

describe("xpIdempotencyKey", () => {
  it("produit une clé stable et distincte par portée", () => {
    expect(xpIdempotencyKey("lesson_completed", "les-1")).toBe(
      "lesson_completed:les-1",
    );
    expect(xpIdempotencyKey("lesson_completed", "les-1")).toBe(
      xpIdempotencyKey("lesson_completed", "les-1"),
    );
    expect(xpIdempotencyKey("lesson_completed", "les-1")).not.toBe(
      xpIdempotencyKey("lesson_completed", "les-2"),
    );
  });
});
