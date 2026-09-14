import { describe, expect, it } from "vitest";
import {
  DEFAULT_EASE,
  MIN_EASE,
  formatInterval,
  initialState,
  isSuccess,
  nextDueDate,
  review,
  type Sm2State,
} from "@/lib/srs/sm2";

describe("initialState", () => {
  it("part d'une carte neuve, jamais vue", () => {
    expect(initialState()).toEqual({
      ease: DEFAULT_EASE,
      intervalDays: 0,
      reps: 0,
      lapses: 0,
    });
  });
});

describe("review — progression nominale", () => {
  it("place la première réussite à 1 jour", () => {
    const s = review(initialState(), 4);
    expect(s.intervalDays).toBe(1);
    expect(s.reps).toBe(1);
    expect(s.lapses).toBe(0);
  });

  it("place la deuxième réussite à 6 jours", () => {
    const s = review(review(initialState(), 4), 4);
    expect(s.intervalDays).toBe(6);
    expect(s.reps).toBe(2);
  });

  it("multiplie ensuite l'intervalle par le facteur de facilité", () => {
    const third = review(review(review(initialState(), 4), 4), 4);
    // 6 jours × facilité (2.5 inchangée par une note de 4) = 15 jours.
    expect(third.intervalDays).toBe(15);
    expect(third.reps).toBe(3);
  });

  it("allonge les intervalles plus vite avec des notes « Facile »", () => {
    let easy = initialState();
    let good = initialState();
    for (let i = 0; i < 4; i++) {
      easy = review(easy, 5);
      good = review(good, 4);
    }
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
  });
});

describe("review — échec", () => {
  it("ramène la carte à 1 jour et incrémente les oublis", () => {
    const mature = review(review(review(initialState(), 4), 4), 4);
    const failed = review(mature, 1);

    expect(failed.intervalDays).toBe(1);
    expect(failed.reps).toBe(0);
    expect(failed.lapses).toBe(1);
  });

  it("conserve une partie de la facilité acquise après un oubli", () => {
    const mature = review(review(initialState(), 5), 5);
    const failed = review(mature, 0);
    expect(failed.ease).toBeGreaterThan(MIN_EASE);
  });

  it("ne descend jamais la facilité sous le plancher, même après des oublis répétés", () => {
    let s = initialState();
    for (let i = 0; i < 20; i++) s = review(s, 0);
    expect(s.ease).toBe(MIN_EASE);
  });
});

describe("review — robustesse", () => {
  it("ne mute pas l'état reçu", () => {
    const before = initialState();
    const snapshot = { ...before };
    review(before, 4);
    expect(before).toEqual(snapshot);
  });

  it("assainit un état corrompu plutôt que de propager NaN", () => {
    const broken = {
      ease: Number.NaN,
      intervalDays: -5,
      reps: -2,
      lapses: -1,
    } as Sm2State;
    const s = review(broken, 4);

    expect(Number.isFinite(s.ease)).toBe(true);
    expect(s.intervalDays).toBeGreaterThanOrEqual(1);
    expect(s.reps).toBeGreaterThanOrEqual(0);
    expect(s.lapses).toBeGreaterThanOrEqual(0);
  });

  it("garde un intervalle d'au moins un jour", () => {
    let s = initialState();
    for (let i = 0; i < 10; i++) s = review(s, 3);
    expect(s.intervalDays).toBeGreaterThanOrEqual(1);
  });
});

describe("isSuccess", () => {
  it("considère 3 et au-delà comme une réussite", () => {
    expect(isSuccess(0)).toBe(false);
    expect(isSuccess(2)).toBe(false);
    expect(isSuccess(3)).toBe(true);
    expect(isSuccess(5)).toBe(true);
  });
});

describe("nextDueDate", () => {
  it("décale la date du nombre de jours de l'intervalle", () => {
    const from = new Date("2026-03-01T10:00:00");
    const due = nextDueDate({ ...initialState(), intervalDays: 6 }, from);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(2);
    expect(due.getDate()).toBe(7);
  });
});

describe("formatInterval", () => {
  it("rend des libellés lisibles en français", () => {
    expect(formatInterval(0)).toBe("maintenant");
    expect(formatInterval(1)).toBe("1 j");
    expect(formatInterval(12)).toBe("12 j");
    expect(formatInterval(60)).toBe("2 mois");
    expect(formatInterval(400)).toBe("1 an");
  });
});
