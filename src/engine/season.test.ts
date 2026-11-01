import { describe, expect, it } from "vitest";
import { LIVE_SEASONS } from "./hills";
import { bakerPenaltyNote } from "./labels";
import { buildPlan } from "./plan";
import {
  likelyCall,
  liveSeason,
  simulate,
  worthWatching,
  type SimDay,
} from "./season";
import { addDays } from "./time";
import {
  DEFAULT_PREFS,
  type DayView,
  type DayWeather,
  type HillId,
  type UserPrefs,
  type WeatherByDate,
} from "./types";

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function syntheticActuals(): Record<HillId, WeatherByDate> {
  const rnd = lcg(42);
  const out: Record<HillId, WeatherByDate> = { whistler: {}, baker: {} };
  for (const y of LIVE_SEASONS) {
    for (let d = `${y}-11-01`; d <= `${y + 1}-04-30`; d = addDays(d, 1)) {
      for (const hill of ["whistler", "baker"] as const) {
        const snow72 = Math.round(rnd() * 40);
        out[hill][d] = {
          snow24: Math.round(rnd() * snow72),
          snow72,
          low: {
            base: { rain: rnd() < 0.3 ? Math.round(rnd() * 8) : 0, tempMax: Math.round(rnd() * 8 - 3) },
            mid: { rain: rnd() < 0.15 ? Math.round(rnd() * 5) : 0, tempMax: Math.round(rnd() * 6 - 5) },
          },
          windSummitMax: Math.round(rnd() * 70),
          windSummitOvernightMax: Math.round(rnd() * 70),
          cloudMean: Math.round(rnd() * 100),
          snowSkiHours: Math.round(rnd() * 8),
        };
      }
    }
  }
  return out;
}

const ACTUALS = syntheticActuals();
const NO_FORECASTS: Record<HillId, WeatherByDate> = { whistler: {}, baker: {} };

function weather(snow72: number, cloudMean: number): DayWeather {
  return {
    snow24: 0,
    snow72,
    low: { base: { rain: 0, tempMax: -2 }, mid: { rain: 0, tempMax: -4 } },
    windSummitMax: 10,
    windSummitOvernightMax: 10,
    cloudMean,
    snowSkiHours: 0,
  };
}

function allDays(r: ReturnType<typeof liveSeason>): DayView[] {
  return r.weekends.flatMap((w) => w.days);
}

function expectAllFinite(value: unknown, path = "root"): void {
  if (typeof value === "number") {
    expect(Number.isFinite(value), path).toBe(true);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => expectAllFinite(v, `${path}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) expectAllFinite(v, `${path}.${k}`);
  }
}

const SUNDAY_NOV_1 = new Date("2026-11-02T01:00:00Z");
const IN_SEASON = new Date("2026-12-09T20:00:00Z");

describe("liveSeason before the season", () => {
  const r = liveSeason({ now: SUNDAY_NOV_1, prefs: DEFAULT_PREFS, log: [], forecasts: NO_FORECASTS, actuals: ACTUALS });

  it("shows the Oct 31-Nov 1 weekend with Saturday past and Sunday pre-season", () => {
    expect(r.today).toBe("2026-11-01");
    expect(r.current.saturday).toBe("2026-10-31");
    const [sat, sun] = r.current.days;
    expect(sat.status).toBe("past");
    expect(sat.call).toBeNull();
    expect(sun.status).toBe("preseason");
    expect(sun.call).toBe("dog");
    expect(sun.note).toBe("Before your first ski day");
    expect(sun.loggable).toEqual({
      ok: false,
      reason: "You can log days from Sat Nov 21, your first ski day, once they've happened.",
    });
  });

  it("days before the first ski day carry no chance numbers", () => {
    for (const d of r.current.days) {
      expect(d.chances).toBeNull();
      expect(d.likely).toBeNull();
      expect(d.expectedLeftAfter).toBeNull();
    }
  });

  it("runs weekends from the first ski day's weekend to the last ski day", () => {
    expect(r.weekends[0].saturday).toBe("2026-11-21");
    expect(r.weekends.at(-1)?.saturday).toBe("2027-04-10");
    expect(r.weekends.at(-1)?.days[1].status).toBe("preseason");
    expect(r.weekends.at(-1)?.days[1].note).toBe("After your last ski day");
  });

  it("tags days by days out", () => {
    const days = allDays(r);
    expect(days[0].tag).toBe("Historical outlook");
    expect(days.every((d) => d.status === "outlook" || d.status === "preseason")).toBe(true);
  });

  it("the sum of each hill's chance across the season is at most its days left", () => {
    const days = allDays(r);
    const sum = (h: HillId) => days.reduce((a, d) => a + (d.chances?.[h] ?? 0), 0);
    expect(sum("whistler")).toBeLessThanOrEqual(5 + 1e-9);
    expect(sum("baker")).toBeLessThanOrEqual(2 + 1e-9);
    expect(sum("whistler")).toBeGreaterThan(0);
    for (const d of days) {
      if (!d.chances) continue;
      expect(d.chances.whistler + d.chances.baker + d.chances.dog).toBeCloseTo(1);
    }
  });

  it("never gives Baker a chance before its open date", () => {
    for (const d of allDays(r)) {
      if (d.date < DEFAULT_PREFS.bakerOpenDate && d.chances) expect(d.chances.baker).toBe(0);
      if (d.date < DEFAULT_PREFS.bakerOpenDate) expect(d.hills.baker.bar).toBeNull();
    }
  });

  it("spreads days through the season rather than hoarding them all for spring", () => {
    const days = allDays(r);
    const early = days.filter((d) => d.date < "2027-02-01").reduce((a, d) => a + (d.chances?.whistler ?? 0), 0);
    expect(early).toBeGreaterThan(0.5);
  });

  it("gives the same output for the same inputs", () => {
    const again = liveSeason({
      now: SUNDAY_NOV_1,
      prefs: DEFAULT_PREFS,
      log: [],
      forecasts: NO_FORECASTS,
      actuals: ACTUALS,
    });
    expect(JSON.stringify(again)).toBe(JSON.stringify(r));
  });
});

describe("liveSeason in season", () => {
  it("with 0 days left at both hills, every day's chance of dog is 100%", () => {
    const prefs = { ...DEFAULT_PREFS, whistlerDays: 0, bakerDays: 0 };
    const r = liveSeason({ now: IN_SEASON, prefs, log: [], forecasts: NO_FORECASTS, actuals: ACTUALS });
    const days = allDays(r).filter((d) => d.chances);
    expect(days.length).toBeGreaterThan(30);
    for (const d of days) {
      expect(d.chances).toEqual({ whistler: 0, baker: 0, dog: 1 });
      expect(d.likely).toBe("dog");
      expect(d.hills.whistler.bar).toBeNull();
    }
  });

  it("counts logged days and gives logged days no chances", () => {
    const log = [
      { date: "2026-11-28", hill: "whistler" as const },
      { date: "2026-12-06", hill: "baker" as const },
      { date: "2026-10-01", hill: "whistler" as const },
    ];
    const now = new Date("2026-12-06T20:00:00Z");
    const r = liveSeason({ now, prefs: DEFAULT_PREFS, log, forecasts: NO_FORECASTS, actuals: ACTUALS });
    expect(r.daysLeft).toEqual({ whistler: 4, baker: 1 });
    const sun = r.current.days[1];
    expect(sun.date).toBe("2026-12-06");
    expect(sun.status).toBe("logged");
    expect(sun.logged).toBe("baker");
    expect(sun.call).toBeNull();
    expect(sun.chances).toBeNull();
    expect(sun.loggable).toEqual({ ok: false, reason: "You already logged 2026-12-06" });
    const sat = r.current.days[0];
    expect(sat.status).toBe("past");
    expect(sat.loggable).toEqual({ ok: true });
    const sum = (h: HillId) => allDays(r).reduce((a, d) => a + (d.chances?.[h] ?? 0), 0);
    expect(sum("whistler")).toBeLessThanOrEqual(4 + 1e-9);
    expect(sum("baker")).toBeLessThanOrEqual(1 + 1e-9);
  });

  it("calls forecast days with choose and shows the forecast beside the outlook at 8 to 15 days", () => {
    const forecasts: Record<HillId, WeatherByDate> = {
      whistler: { "2026-12-12": weather(30, 10), "2026-12-13": weather(0, 95), "2026-12-19": weather(5, 60) },
      baker: { "2026-12-12": weather(5, 60), "2026-12-13": weather(0, 95), "2026-12-19": weather(5, 60) },
    };
    const r = liveSeason({ now: IN_SEASON, prefs: DEFAULT_PREFS, log: [], forecasts, actuals: ACTUALS });
    const [sat, sun] = r.current.days;
    expect(sat.status).toBe("forecast");
    expect(sat.tag).toBe("Forecast");
    expect(sat.daysOut).toBe(3);
    expect(sat.hills.whistler.forecast?.score).toBe(100);
    expect(sat.call).toBe("whistler");
    expect(sat.chances).toEqual({ whistler: 1, baker: 0, dog: 0 });
    expect(sat.likely).toBe("whistler");
    expect(sat.expectedLeftAfter).toEqual({ whistler: 4, baker: 2 });
    expect(sun.status).toBe("forecast");
    expect(sun.call).toBe("dog");
    expect(r.current.worthWatching).toBe(true);

    const next = r.weekends.find((w) => w.saturday === "2026-12-19");
    const early = next?.days[0];
    expect(early?.tag).toBe("Early forecast");
    expect(early?.status).toBe("outlook");
    expect(early?.hills.whistler.forecast?.score).toBe(50);
    expect(early?.hills.whistler.outlook).not.toBeNull();
    expect(early?.call).toBeNull();
  });

  it("says when Baker loses to Whistler only because of the travel penalty", () => {
    const now = new Date("2027-04-08T20:00:00Z");
    const forecasts: Record<HillId, WeatherByDate> = {
      whistler: { "2027-04-10": weather(22, 10) },
      baker: { "2027-04-10": weather(25, 10) },
    };
    const r = liveSeason({ now, prefs: DEFAULT_PREFS, log: [], forecasts, actuals: ACTUALS });
    const sat = r.current.days[0];
    expect(sat.hills.whistler.forecast?.score).toBe(99);
    expect(sat.hills.baker.forecast?.score).toBe(100);
    expect(sat.call).toBe("whistler");
    expect(sat.note).toBe(bakerPenaltyNote(1, 10));

    const noPenalty = liveSeason({
      now,
      prefs: { ...DEFAULT_PREFS, bakerTravelPenalty: 0 },
      log: [],
      forecasts,
      actuals: ACTUALS,
    });
    expect(noPenalty.current.days[0].call).toBe("baker");
    expect(noPenalty.current.days[0].note).toBeNull();
  });
});

describe("empty samples", () => {
  const prefs: UserPrefs = { ...DEFAULT_PREFS, lastSkiDay: "2027-05-15" };
  const r = liveSeason({ now: SUNDAY_NOV_1, prefs, log: [], forecasts: NO_FORECASTS, actuals: ACTUALS });

  it("a day with no history gets a null outlook and a 100% dog call", () => {
    const may = allDays(r).find((d) => d.date === "2027-05-08");
    expect(may?.status).toBe("outlook");
    expect(may?.hills.whistler.outlook).toBeNull();
    expect(may?.hills.baker.outlook).toBeNull();
    expect(may?.chances).toEqual({ whistler: 0, baker: 0, dog: 1 });
    expect(may?.likely).toBe("dog");
  });

  it("produces no NaN anywhere", () => {
    expect(JSON.stringify(r)).not.toContain("NaN");
    expectAllFinite(r);
  });
});

describe("simulate", () => {
  it("never spends more days than are left on any path", () => {
    const rnd = lcg(7);
    const open = { whistler: true, baker: true };
    const n = 10;
    const pathCount = 63;
    const days: SimDay[] = Array.from({ length: n }, (_, d) => ({
      d,
      open,
      fixed: null,
      paths: Array.from({ length: pathCount }, () => ({
        w: Math.round(rnd() * 100),
        b: Math.round(rnd() * 100),
      })),
    }));
    const plan = buildPlan(
      days.map((s, d) => ({ date: `d${d}`, open, samples: s.paths.filter((p) => p !== null) })),
      2,
      1,
      DEFAULT_PREFS,
    );
    const res = simulate(days, plan, DEFAULT_PREFS, { whistler: 2, baker: 1 }, pathCount);
    const sumW = res.reduce((a, r) => a + r.chances.whistler, 0);
    const sumB = res.reduce((a, r) => a + r.chances.baker, 0);
    expect(sumW).toBeLessThanOrEqual(2 + 1e-9);
    expect(sumB).toBeLessThanOrEqual(1 + 1e-9);
    for (const r of res) {
      expect(r.expectedLeftAfter.whistler).toBeGreaterThanOrEqual(0);
      expect(r.expectedLeftAfter.baker).toBeGreaterThanOrEqual(0);
    }
    expect(res[0].before).toEqual({ whistler: 2, baker: 1 });
    expect(simulate(days, plan, DEFAULT_PREFS, { whistler: 2, baker: 1 }, pathCount)).toEqual(res);
  });
});

describe("thresholds at 49%, 50% and 51%", () => {
  function outlookDay(chanceAboveBar: number): DayView {
    const hill = { open: true, forecast: null, outlook: { median: 50, p25: 40, p75: 60, chanceAboveBar }, bar: 60 };
    return {
      date: "2027-01-09",
      weekday: "Sat",
      daysOut: 40,
      status: "outlook",
      tag: "Historical outlook",
      call: null,
      note: null,
      logged: null,
      hills: { whistler: hill, baker: { ...hill, outlook: { ...hill.outlook, chanceAboveBar: 0 } } },
      chances: null,
      likely: null,
      expectedLeftAfter: null,
      loggable: { ok: false, reason: "x" },
    };
  }

  it("worth watching switches on at 50%", () => {
    expect(worthWatching([outlookDay(0.49), outlookDay(0)])).toBe(false);
    expect(worthWatching([outlookDay(0.5), outlookDay(0)])).toBe(true);
    expect(worthWatching([outlookDay(0), outlookDay(0.51)])).toBe(true);
  });

  it("the likely label switches on at 50%, else could go either way (null)", () => {
    expect(likelyCall({ whistler: 0.49, baker: 0.2, dog: 0.31 })).toBeNull();
    expect(likelyCall({ whistler: 0.5, baker: 0.2, dog: 0.3 })).toBe("whistler");
    expect(likelyCall({ whistler: 0.51, baker: 0.2, dog: 0.29 })).toBe("whistler");
    expect(likelyCall({ whistler: 0.2, baker: 0.49, dog: 0.31 })).toBeNull();
    expect(likelyCall({ whistler: 0.2, baker: 0.5, dog: 0.3 })).toBe("baker");
    expect(likelyCall({ whistler: 0.29, baker: 0.2, dog: 0.51 })).toBe("dog");
    expect(likelyCall(null)).toBeNull();
  });

  it("a forecast day is worth watching when its score reaches the bar", () => {
    const day = outlookDay(0);
    const at = (score: number): DayView => ({
      ...day,
      status: "forecast",
      hills: {
        ...day.hills,
        whistler: {
          ...day.hills.whistler,
          outlook: null,
          forecast: { score, raw: score, parts: [], reasons: [] },
        },
      },
    });
    expect(worthWatching([at(59)])).toBe(false);
    expect(worthWatching([at(60)])).toBe(true);
  });
});
