import { describe, expect, it } from "vitest";
import { ACTUALS, FORECAST_FRI, FORECAST_WED } from "./data";
import { scorecard } from "./scorecard";
import { DEFAULT_PREFS, DEMO_PREFS, type StrategyKey, type UserPrefs } from "./types";

const VARIANTS: [string, UserPrefs][] = [
  ["demo", DEMO_PREFS],
  ["default", DEFAULT_PREFS],
  ["bluebird, penalty 30", { ...DEFAULT_PREFS, visibilityPref: "bluebird", bakerTravelPenalty: 30 }],
  ["10 and 3 days, floor 50", { ...DEFAULT_PREFS, whistlerDays: 10, bakerDays: 3, dogFloor: 50 }],
  ["powder, no avy penalty", { ...DEMO_PREFS, visibilityPref: "powder", avyPenaltyWhistler: 0 }],
];

const KEYS: StrategyKey[] = ["friday", "wednesday", "simple", "alwaysDog"];

describe("scorecard", () => {
  for (const [name, prefs] of VARIANTS) {
    it(`hindsight is at least every other strategy (${name})`, () => {
      const sc = scorecard(prefs, ACTUALS, FORECAST_FRI, FORECAST_WED);
      const h = sc.strategies.hindsight.points;
      for (const k of KEYS) expect(h).toBeGreaterThanOrEqual(sc.strategies[k].points);
      expect(sc.strategies.hindsight.share).toBe(1);
      expect(sc.strategies.hindsight.pctOfHindsight).toBe(1);
      expect(sc.strategies.alwaysDog.share).toBe(0);
      expect(sc.strategies.alwaysDog.points).toBe(prefs.dogFloor * sc.replayDays);
      expect(sc.noGain).toBe(false);
      expect(Number.isFinite(sc.forecastErrorCost)).toBe(true);
      expect(sc.daysSpent.filter((d) => d.call === "whistler").length).toBeLessThanOrEqual(prefs.whistlerDays);
      expect(sc.daysSpent.filter((d) => d.call === "baker").length).toBeLessThanOrEqual(prefs.bakerDays);
    });
  }

  it("with demo settings the Friday planner beats the Simple rule and always dog", () => {
    const sc = scorecard(DEMO_PREFS, ACTUALS, FORECAST_FRI, FORECAST_WED);
    const friday = sc.strategies.friday.share ?? 0;
    const simple = sc.strategies.simple.share ?? 0;
    expect(friday).toBeGreaterThan(simple);
    expect(friday).toBeGreaterThan(0);
  });

  it("returns the no-gain case when hindsight equals always dog", () => {
    const sc = scorecard({ ...DEFAULT_PREFS, dogFloor: 100 }, ACTUALS, FORECAST_FRI, FORECAST_WED);
    expect(sc.strategies.hindsight.points).toBe(sc.strategies.alwaysDog.points);
    expect(sc.noGain).toBe(true);
    for (const k of [...KEYS, "hindsight" as const]) {
      expect(sc.strategies[k].share).toBeNull();
      expect(Number.isFinite(sc.strategies[k].pctOfHindsight)).toBe(true);
    }
  });

  it("gives a strategy below always dog a negative share", () => {
    const sc = scorecard({ ...DEFAULT_PREFS, dogFloor: 80 }, ACTUALS, FORECAST_FRI, FORECAST_WED);
    expect(sc.noGain).toBe(false);
    expect(sc.strategies.simple.points).toBeLessThan(sc.strategies.alwaysDog.points);
    expect(sc.strategies.simple.share).toBeLessThan(0);
  });

  it("lists the Friday planner's days", () => {
    const sc = scorecard(DEMO_PREFS, ACTUALS, FORECAST_FRI, FORECAST_WED);
    expect(sc.daysSpent).toContainEqual({ date: "2026-02-08", call: "whistler" });
  });
});
