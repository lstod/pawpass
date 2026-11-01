import { describe, expect, it } from "vitest";
import { ACTUALS, FORECAST_FRI, FORECAST_WED } from "./data";
import { HILLS, HILL_IDS } from "./hills";
import { MISS_AT, replay, replayPrefs, replayWindow } from "./replay";
import { scoreDay } from "./score";
import {
  DEFAULT_PREFS,
  DEMO_PREFS,
  type DayWeather,
  type HillId,
  type UserPrefs,
  type WeatherByDate,
} from "./types";

function weather(overrides: Partial<DayWeather> = {}): DayWeather {
  return {
    snow24: 0,
    snow72: 0,
    low: { base: { rain: 0, tempMax: -2 }, mid: { rain: 0, tempMax: -4 } },
    windSummitMax: 10,
    windSummitOvernightMax: 10,
    cloudMean: 60,
    snowSkiHours: 0,
    ...overrides,
  };
}

const VARIANTS: [string, UserPrefs][] = [
  ["demo", DEMO_PREFS],
  ["default", DEFAULT_PREFS],
  ["bluebird, penalty 30", { ...DEFAULT_PREFS, visibilityPref: "bluebird", bakerTravelPenalty: 30 }],
  ["10 and 3 days", { ...DEFAULT_PREFS, whistlerDays: 10, bakerDays: 3, dogFloor: 50 }],
];

describe("replay window", () => {
  it("maps the season dates onto 2025-26", () => {
    expect(replayWindow(DEFAULT_PREFS)).toEqual({ first: "2025-11-21", last: "2026-04-10" });
  });

  it("clamps to Nov 1 to Apr 30", () => {
    expect(replayWindow({ ...DEFAULT_PREFS, firstSkiDay: "2026-10-15", lastSkiDay: "2027-05-15" })).toEqual({
      first: "2025-11-01",
      last: "2026-04-30",
    });
  });

  it("uses each hill's 2025-26 opening", () => {
    const p = replayPrefs(DEMO_PREFS);
    expect(p.whistlerOpenDate).toBe(HILLS.whistler.replayOpenDate);
    expect(p.bakerOpenDate).toBe(HILLS.baker.replayOpenDate);
  });
});

describe("replay on the committed data", () => {
  for (const [name, prefs] of VARIANTS) {
    describe(name, () => {
      const days = replay(prefs, ACTUALS, FORECAST_FRI, FORECAST_WED);

      it("covers every weekend day in the window", () => {
        expect(days[0].date).toBe("2025-11-22");
        expect(days.at(-1)?.date).toBe("2026-04-05");
        expect(days.length).toBe(40);
      });

      it("carries days left and never spends more than the allowance", () => {
        let left = { whistler: prefs.whistlerDays, baker: prefs.bakerDays };
        for (const d of days) {
          expect(d.leftBefore).toEqual(left);
          const spent = { whistler: d.friday.call === "whistler" ? 1 : 0, baker: d.friday.call === "baker" ? 1 : 0 };
          expect(d.leftAfter).toEqual({ whistler: left.whistler - spent.whistler, baker: left.baker - spent.baker });
          left = d.leftAfter;
          expect(left.whistler).toBeGreaterThanOrEqual(0);
          expect(left.baker).toBeGreaterThanOrEqual(0);
        }
        const wed = (h: HillId) => days.filter((d) => d.wednesday.call === h).length;
        expect(wed("whistler")).toBeLessThanOrEqual(prefs.whistlerDays);
        expect(wed("baker")).toBeLessThanOrEqual(prefs.bakerDays);
      });

      it("never chooses a hill before its 2025-26 opening", () => {
        for (const d of days) {
          for (const h of HILL_IDS) {
            if (d.date < HILLS[h].replayOpenDate) {
              expect(d.open[h]).toBe(false);
              expect(d.friday.call).not.toBe(h);
              expect(d.wednesday.call).not.toBe(h);
              expect(d.friday.bars[h]).toBeNull();
            }
          }
        }
      });

      it("scores each call on actual weather", () => {
        for (const d of days) {
          const expected =
            d.friday.call === "dog"
              ? prefs.dogFloor
              : d.friday.call === "whistler"
                ? d.actual.whistler.score
                : d.actual.baker.score - prefs.bakerTravelPenalty;
          expect(d.value).toBe(expected);
          expect(d.changed).toBe(d.friday.call !== d.wednesday.call);
        }
      });

      it("uses the Friday and Wednesday views as the forecasts", () => {
        const p = replayPrefs(prefs);
        for (const d of days) {
          expect(d.friday.scores.whistler?.score).toBe(scoreDay(FORECAST_FRI.whistler[d.date], "whistler", p).score);
          expect(d.wednesday.scores.baker?.score).toBe(scoreDay(FORECAST_WED.baker[d.date], "baker", p).score);
        }
      });

      it("flags misses of 25 or more on the chosen hill", () => {
        for (const d of days) {
          if (d.miss) {
            expect(Math.abs(d.miss.forecast - d.miss.actual)).toBeGreaterThanOrEqual(MISS_AT);
            if (d.friday.call !== "dog") expect(d.miss.hill).toBe(d.friday.call);
            expect(d.miss.reason).toMatch(/^[a-z0-9]/);
          } else if (d.friday.call !== "dog") {
            const f = d.friday.scores[d.friday.call]?.score ?? 0;
            expect(Math.abs(f - d.actual[d.friday.call].score)).toBeLessThan(MISS_AT);
          }
        }
      });
    });
  }

  it("holds out 2025-26 from the planning samples", () => {
    const changed: Record<HillId, WeatherByDate> = { whistler: { ...ACTUALS.whistler }, baker: { ...ACTUALS.baker } };
    for (const h of HILL_IDS) {
      for (const date of Object.keys(changed[h])) {
        const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
        if (date >= "2025-08-01" && dow !== 0 && dow !== 6) changed[h][date] = weather({ snow72: 40, cloudMean: 5 });
      }
    }
    const a = replay(DEMO_PREFS, ACTUALS, FORECAST_FRI, FORECAST_WED);
    const b = replay(DEMO_PREFS, changed, FORECAST_FRI, FORECAST_WED);
    expect(b.map((d) => [d.friday.call, d.friday.bars])).toEqual(a.map((d) => [d.friday.call, d.friday.bars]));
  });

  it("is deterministic", () => {
    expect(JSON.stringify(replay(DEMO_PREFS, ACTUALS, FORECAST_FRI, FORECAST_WED))).toBe(
      JSON.stringify(replay(DEMO_PREFS, ACTUALS, FORECAST_FRI, FORECAST_WED)),
    );
  });
});

describe("miss reasons", () => {
  const prefs: UserPrefs = { ...DEFAULT_PREFS, firstSkiDay: "2027-01-10", lastSkiDay: "2027-01-11" };
  const empty = { whistler: {}, baker: {} };

  it("names the first thing that went wrong, or says it was flatter", () => {
    const actuals = {
      whistler: {
        "2026-01-10": weather({ low: { base: { rain: 5, tempMax: 1 } } }),
        "2026-01-11": weather({ snow72: 5 }),
      },
      baker: { "2026-01-10": weather(), "2026-01-11": weather() },
    };
    const fri = {
      whistler: { "2026-01-10": weather({ snow72: 30 }), "2026-01-11": weather({ snow72: 30 }) },
      baker: { "2026-01-10": weather(), "2026-01-11": weather() },
    };
    const days = replay({ ...prefs, whistlerDays: 2 }, actuals, fri, empty);
    expect(days.map((d) => d.friday.call)).toEqual(["whistler", "whistler"]);
    expect(days[0].miss).toEqual({ hill: "whistler", forecast: 90, actual: 0, reason: "rain at 675 m (5 mm)" });
    expect(days[1].miss).toEqual({ hill: "whistler", forecast: 90, actual: 50, reason: "it was flatter than forecast" });
  });

  it("checks the higher-forecast open hill on a dog day", () => {
    const actuals = {
      whistler: { "2026-01-10": weather({ windSummitMax: 60 }), "2026-01-11": weather() },
      baker: { "2026-01-10": weather(), "2026-01-11": weather() },
    };
    const fri = {
      whistler: { "2026-01-10": weather({ snow72: 30 }), "2026-01-11": weather() },
      baker: { "2026-01-10": weather(), "2026-01-11": weather() },
    };
    const days = replay({ ...prefs, whistlerDays: 0, bakerDays: 0 }, actuals, fri, empty);
    expect(days[0].friday.call).toBe("dog");
    expect(days[0].miss).toEqual({ hill: "whistler", forecast: 90, actual: 20, reason: "wind holds likely" });
    expect(days[1].miss).toBeNull();
  });
});
