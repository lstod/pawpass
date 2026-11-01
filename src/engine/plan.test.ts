import { describe, expect, it } from "vitest";
import { bars, buildPlan, choose, type PlanDay } from "./plan";
import { DEFAULT_PREFS, type HillId, type Sample, type UserPrefs } from "./types";

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const BOTH = { whistler: true, baker: true };

function randomDays(n: number, seed: number, open: Record<HillId, boolean> = BOTH): PlanDay[] {
  const rnd = lcg(seed);
  return Array.from({ length: n }, (_, i) => ({
    date: `day-${i}`,
    open,
    samples: Array.from({ length: 21 }, (): Sample => ({
      w: Math.round(rnd() * 100),
      b: Math.round(rnd() * 100),
    })),
  }));
}

const prefs: UserPrefs = { ...DEFAULT_PREFS };

describe("planning table", () => {
  it("has V[D] = 0", () => {
    const plan = buildPlan(randomDays(4, 1), 3, 2, prefs);
    expect(plan.V[4].flat().every((v) => v === 0)).toBe(true);
  });

  it("with 0 Whistler and 0 Baker days, every call is dog", () => {
    const days = randomDays(10, 2);
    const plan = buildPlan(days, 0, 0, prefs);
    for (let d = 0; d < days.length; d++) {
      expect(choose(100, 100, d, 0, 0, plan, prefs, BOTH)).toBe("dog");
      expect(bars(d, 0, 0, plan, prefs, BOTH)).toEqual({ whistler: null, baker: null });
    }
    expect(plan.V[0][0][0]).toBeCloseTo(prefs.dogFloor * 10);
  });

  it("V never decreases as w or b increases", () => {
    const plan = buildPlan(randomDays(16, 3), 6, 3, prefs);
    for (const layer of plan.V) {
      for (let w = 0; w < layer.length; w++) {
        for (let b = 0; b < layer[w].length; b++) {
          if (w > 0) expect(layer[w][b]).toBeGreaterThanOrEqual(layer[w - 1][b] - 1e-9);
          if (b > 0) expect(layer[w][b]).toBeGreaterThanOrEqual(layer[w][b - 1] - 1e-9);
        }
      }
    }
  });

  it("with remaining days equal to remaining weekend days, the bar equals the dog floor", () => {
    const days = randomDays(8, 4);
    const plan = buildPlan(days, 8, 0, prefs);
    for (let d = 0; d < days.length; d++) {
      expect(bars(d, days.length - d, 0, plan, prefs, BOTH).whistler).toBe(prefs.dogFloor);
    }
    const bakerPlan = buildPlan(days, 0, 8, prefs);
    for (let d = 0; d < days.length; d++) {
      expect(bars(d, 0, days.length - d, bakerPlan, prefs, BOTH).baker).toBe(
        prefs.dogFloor + prefs.bakerTravelPenalty,
      );
    }
  });

  it("raises the bar when days are scarce", () => {
    const days = randomDays(20, 5);
    const plan = buildPlan(days, 5, 0, prefs);
    const scarce = bars(0, 1, 0, plan, prefs, BOTH).whistler ?? 0;
    const plenty = bars(0, 5, 0, plan, prefs, BOTH).whistler ?? 0;
    expect(scarce).toBeGreaterThan(plenty);
  });

  it("choose skis exactly when the score reaches the bar", () => {
    const days = randomDays(12, 6);
    const plan = buildPlan(days, 3, 0, prefs);
    const closedBaker = { whistler: true, baker: false };
    const bar = bars(2, 2, 0, plan, prefs, closedBaker).whistler ?? 0;
    expect(choose(bar, 0, 2, 2, 0, plan, prefs, closedBaker)).toBe("whistler");
    expect(choose(bar - 1, 0, 2, 2, 0, plan, prefs, closedBaker)).toBe("dog");
  });

  it("a hill is never chosen before its open date or outside the season", () => {
    const closed = { whistler: false, baker: false };
    const days = randomDays(6, 7).map((d, i) => (i < 3 ? { ...d, open: closed } : d));
    const plan = buildPlan(days, 3, 2, prefs);
    for (let d = 0; d < 3; d++) {
      expect(choose(100, 100, d, 3, 2, plan, prefs, closed)).toBe("dog");
      expect(choose(100, 100, d, 3, 2, plan, prefs, { whistler: true, baker: false })).toBe("whistler");
      expect(choose(0, 100, d, 3, 2, plan, prefs, { whistler: false, baker: true })).toBe("baker");
      expect(bars(d, 3, 2, plan, prefs, closed)).toEqual({ whistler: null, baker: null });
    }
    expect(plan.V[0][3][2]).toBeCloseTo(3 * prefs.dogFloor + plan.V[3][3][2]);
  });

  it("treats a day with no samples as a dog day", () => {
    const days = randomDays(4, 8);
    days[1] = { ...days[1], samples: [] };
    const plan = buildPlan(days, 2, 1, prefs);
    for (let w = 0; w <= 2; w++) {
      for (let b = 0; b <= 1; b++) {
        expect(plan.V[1][w][b]).toBeCloseTo(prefs.dogFloor + plan.V[2][w][b]);
      }
    }
    expect(plan.V.flat(2).every(Number.isFinite)).toBe(true);
  });
});

describe("personal settings change the calls", () => {
  it("with identical forecasts at both hills, a Baker penalty of 0 can choose Baker and 30 never does", () => {
    const rnd = lcg(9);
    const days: PlanDay[] = Array.from({ length: 12 }, (_, i) => ({
      date: `day-${i}`,
      open: BOTH,
      samples: Array.from({ length: 21 }, () => {
        const s = Math.round(rnd() * 100);
        return { w: s, b: s };
      }),
    }));
    const zero = { ...prefs, bakerTravelPenalty: 0 };
    const thirty = { ...prefs, bakerTravelPenalty: 30 };
    const planZero = buildPlan(days, 3, 2, zero);
    const planThirty = buildPlan(days, 3, 2, thirty);
    let bakerWithZero = false;
    for (let d = 0; d < days.length; d++) {
      for (let w = 0; w <= 3; w++) {
        for (let b = 0; b <= 2; b++) {
          for (const s of [20, 50, 80, 100]) {
            if (choose(s, s, d, w, b, planZero, zero, BOTH) === "baker") bakerWithZero = true;
            if (w > 0) expect(choose(s, s, d, w, b, planThirty, thirty, BOTH)).not.toBe("baker");
          }
        }
      }
    }
    expect(bakerWithZero).toBe(true);
  });
});
