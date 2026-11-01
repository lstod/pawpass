import { describe, expect, it } from "vitest";
import { AVY_LABEL, scoreDay, scorePercentile } from "./score";
import { DEFAULT_PREFS, type DayWeather, type UserPrefs } from "./types";

function weather(overrides: Partial<DayWeather> = {}): DayWeather {
  return {
    snow24: 0,
    snow72: 0,
    low: { base: { rain: 0, tempMax: -2 }, mid: { rain: 0, tempMax: -5 } },
    windSummitMax: 10,
    windSummitOvernightMax: 10,
    cloudMean: 60,
    snowSkiHours: 0,
    ...overrides,
  };
}

const prefs: UserPrefs = { ...DEFAULT_PREFS };

describe("scoreDay", () => {
  it("starts an ordinary day at 40", () => {
    const s = scoreDay(weather(), "whistler", prefs);
    expect(s.score).toBe(40);
    expect(s.parts).toEqual([{ kind: "base", label: "Ordinary day", points: 40 }]);
    expect(s.reasons).toEqual([]);
  });

  it("adds fresh snow, capped at 50", () => {
    const s = scoreDay(weather({ snow72: 22 }), "whistler", prefs);
    expect(s.parts[1]).toEqual({ kind: "snow", label: "22 cm new at the top in 3 days", points: 44 });
    expect(scoreDay(weather({ snow72: 40 }), "whistler", prefs).score).toBe(90);
  });

  it("rain at the low band lowers the score", () => {
    const dry = scoreDay(weather({ snow72: 10 }), "whistler", prefs);
    const wet = scoreDay(
      weather({ snow72: 10, low: { base: { rain: 4, tempMax: 1 }, mid: { rain: 0, tempMax: -2 } } }),
      "whistler",
      prefs,
    );
    expect(wet.score).toBeLessThan(dry.score);
    expect(wet.reasons).toContain("Rain at 675 m (4 mm)");
    expect(wet.score).toBe(dry.score - 32);
  });

  it("caps rain at 40 and names the 1,300 m band for a mid-mountain user", () => {
    const s = scoreDay(
      weather({ low: { base: { rain: 20, tempMax: 6 }, mid: { rain: 9, tempMax: 4 } } }),
      "whistler",
      { ...prefs, whistlerLowBand: "mid" },
    );
    expect(s.reasons).toEqual(["Rain at 1,300 m (9 mm)", "Warm and heavy at 1,300 m"]);
    expect(s.raw).toBe(40 - 40 - 10);
    expect(s.score).toBe(0);
  });

  it("30 cm over three days, dry and calm, under 10 cm overnight, scores at least 85", () => {
    const s = scoreDay(weather({ snow72: 30, snow24: 8 }), "whistler", prefs);
    expect(s.score).toBeGreaterThanOrEqual(85);
  });

  it("scores wind", () => {
    expect(scoreDay(weather({ windSummitMax: 55 }), "whistler", prefs).reasons).toEqual(["Wind holds likely"]);
    expect(scoreDay(weather({ windSummitMax: 55 }), "whistler", prefs).score).toBe(20);
    expect(scoreDay(weather({ windSummitMax: 35 }), "whistler", prefs).score).toBe(32);
    expect(scoreDay(weather({ windSummitMax: 50 }), "whistler", prefs).reasons).toEqual(["Some wind at the top"]);
    expect(scoreDay(weather({ windSummitMax: 34 }), "whistler", prefs).score).toBe(40);
  });

  it("uses the Baker base band regardless of the Whistler setting", () => {
    const w = weather({ low: { base: { rain: 2, tempMax: 0 } } });
    const s = scoreDay(w, "baker", { ...prefs, whistlerLowBand: "mid" });
    expect(s.reasons).toEqual(["Rain at 1,067 m (2 mm)"]);
  });

  it("scales visibility by preference", () => {
    const sunny = weather({ cloudMean: 10 });
    expect(scoreDay(sunny, "whistler", { ...prefs, visibilityPref: "bluebird" }).score).toBe(70);
    expect(scoreDay(sunny, "whistler", { ...prefs, visibilityPref: "balanced" }).score).toBe(55);
    expect(scoreDay(sunny, "whistler", { ...prefs, visibilityPref: "powder" }).score).toBe(45);
    const storm = weather({ cloudMean: 95, snowSkiHours: 6 });
    expect(scoreDay(storm, "whistler", prefs).raw).toBe(40 - 10 - 8);
  });

  describe("avalanche control", () => {
    it("the same 72-hour total scores lower when 30 cm fell overnight", () => {
      const overnight = scoreDay(weather({ snow72: 30, snow24: 30 }), "whistler", prefs);
      const earlier = scoreDay(weather({ snow72: 30, snow24: 0 }), "whistler", prefs);
      expect(overnight.score).toBeLessThan(earlier.score);
      expect(overnight.reasons).toContain(AVY_LABEL);
    });

    it("triggers on 15 cm with overnight wind loading", () => {
      const s = scoreDay(weather({ snow72: 15, snow24: 15, windSummitOvernightMax: 40 }), "whistler", prefs);
      expect(s.reasons).toContain(AVY_LABEL);
      const calm = scoreDay(weather({ snow72: 15, snow24: 15, windSummitOvernightMax: 39 }), "whistler", prefs);
      expect(calm.reasons).not.toContain(AVY_LABEL);
    });

    it("uses each hill's penalty", () => {
      const w = weather({ snow72: 30, snow24: 30 });
      expect(scoreDay(w, "whistler", prefs).parts.at(-1)?.points).toBe(-20);
      expect(scoreDay(w, "baker", prefs).parts.at(-1)?.points).toBe(-10);
    });

    it("a big Friday-night dump followed by a clear Sunday: Sunday outscores Saturday at Whistler", () => {
      const saturday = weather({ snow24: 32, snow72: 34, cloudMean: 95, snowSkiHours: 3 });
      const sunday = weather({ snow24: 1, snow72: 35, cloudMean: 15 });
      expect(scoreDay(sunday, "whistler", prefs).score).toBeGreaterThan(scoreDay(saturday, "whistler", prefs).score);
    });
  });

  describe("personal settings", () => {
    it("an avalanche-control penalty of 0 removes the storm-morning deduction", () => {
      const w = weather({ snow72: 30, snow24: 30 });
      const s = scoreDay(w, "whistler", { ...prefs, avyPenaltyWhistler: 0 });
      expect(s.parts.some((p) => p.kind === "avy")).toBe(false);
      expect(s.score).toBe(scoreDay(weather({ snow72: 30 }), "whistler", prefs).score);
    });

    it("rain at 675 m but none at 1,300 m scores lower for base-and-up than mid-mountain", () => {
      const w = weather({ low: { base: { rain: 3, tempMax: 2 }, mid: { rain: 0, tempMax: -1 } } });
      const base = scoreDay(w, "whistler", { ...prefs, whistlerLowBand: "base" });
      const mid = scoreDay(w, "whistler", { ...prefs, whistlerLowBand: "mid" });
      expect(base.score).toBeLessThan(mid.score);
    });
  });

  it("visibility flips rankings", () => {
    const deep = weather({ snow72: 30, snow24: 5, cloudMean: 95, snowSkiHours: 8 });
    const sunny = weather({ snow72: 10, cloudMean: 15 });
    const bluebird = { ...prefs, visibilityPref: "bluebird" as const };
    const powder = { ...prefs, visibilityPref: "powder" as const };
    expect(scoreDay(sunny, "whistler", bluebird).score).toBeGreaterThan(scoreDay(deep, "whistler", bluebird).score);
    expect(scoreDay(deep, "whistler", powder).score).toBeGreaterThan(scoreDay(sunny, "whistler", powder).score);
  });

  it("parts sum to the unclamped score and every reason matches one part", () => {
    const cases: DayWeather[] = [
      weather(),
      weather({ snow72: 60, snow24: 40, cloudMean: 10 }),
      weather({ low: { base: { rain: 30, tempMax: 9 }, mid: { rain: 12, tempMax: 6 } }, windSummitMax: 70 }),
      weather({ snow72: 12.6, snow24: 16, windSummitOvernightMax: 45, cloudMean: 97, snowSkiHours: 9 }),
      weather({ snow72: 0.4, low: { base: { rain: 0.04, tempMax: 3 } } }),
    ];
    for (const pref of ["powder", "balanced", "bluebird"] as const) {
      for (const hill of ["whistler", "baker"] as const) {
        for (const w of cases) {
          const s = scoreDay(w, hill, { ...prefs, visibilityPref: pref });
          expect(s.parts.reduce((a, p) => a + p.points, 0)).toBe(s.raw);
          expect(s.score).toBe(Math.max(0, Math.min(100, s.raw)));
          expect(s.parts.every((p) => Number.isInteger(p.points))).toBe(true);
          const nonBase = s.parts.filter((p) => p.kind !== "base").map((p) => p.label);
          expect(s.reasons).toEqual(nonBase);
        }
      }
    }
  });
});

describe("scorePercentile", () => {
  it("is the share of history at or below the score", () => {
    expect(scorePercentile(50, [10, 20, 50, 80])).toBe(75);
    expect(scorePercentile(5, [10, 20])).toBe(0);
    expect(scorePercentile(50, [])).toBeNull();
  });
});
