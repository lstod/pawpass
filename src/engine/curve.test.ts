import { describe, expect, it } from "vitest";
import { pathSamples, sameDayInSeason, samplesFor, scoreCache } from "./curve";
import { LIVE_SEASONS, REPLAY_SEASONS } from "./hills";
import { addDays } from "./time";
import { DEFAULT_PREFS, type DayWeather, type WeatherByDate } from "./types";

function weather(snow72: number): DayWeather {
  return {
    snow24: 0,
    snow72,
    low: { base: { rain: 0, tempMax: -2 }, mid: { rain: 0, tempMax: -4 } },
    windSummitMax: 10,
    windSummitOvernightMax: 10,
    cloudMean: 60,
    snowSkiHours: 0,
  };
}

function around(center: string, snow72: number, out: WeatherByDate) {
  for (let k = -3; k <= 3; k++) out[addDays(center, k)] = weather(snow72);
}

describe("samplesFor", () => {
  const whistler: WeatherByDate = {};
  const baker: WeatherByDate = {};
  around("2025-12-05", 20, whistler);
  around("2025-12-05", 10, baker);
  around("2024-12-05", 5, whistler);
  around("2024-12-05", 5, baker);
  const actuals = { whistler, baker };

  it("live mode includes 2025-26", () => {
    const s = samplesFor("2026-12-05", LIVE_SEASONS, DEFAULT_PREFS, actuals);
    expect(s).toHaveLength(14);
    expect(s).toContainEqual({ w: 80, b: 60 });
  });

  it("replay mode excludes 2025-26", () => {
    const s = samplesFor("2026-12-05", REPLAY_SEASONS, DEFAULT_PREFS, actuals);
    expect(s).toHaveLength(7);
    expect(s).not.toContainEqual({ w: 80, b: 60 });
    expect(s.every((x) => x.w === 50 && x.b === 50)).toBe(true);
  });

  it("pairs scores from the same date and skips dates missing at either hill", () => {
    const w: WeatherByDate = { "2024-01-10": weather(30), "2024-01-11": weather(0) };
    const b: WeatherByDate = { "2024-01-10": weather(0), "2024-01-12": weather(0) };
    const s = samplesFor("2027-01-11", [2023], DEFAULT_PREFS, { whistler: w, baker: b });
    expect(s).toEqual([{ w: 90, b: 40 }]);
  });

  it("gives 7 paths per season in a fixed order, null where data is missing", () => {
    const paths = pathSamples("2026-12-05", [2024, 2025], scoreCache(DEFAULT_PREFS, actuals));
    expect(paths).toHaveLength(14);
    expect(paths[0]).toEqual({ w: 50, b: 50 });
    expect(paths[7]).toEqual({ w: 80, b: 60 });
    expect(pathSamples("2027-05-08", LIVE_SEASONS, scoreCache(DEFAULT_PREFS, actuals)).every((p) => p === null)).toBe(
      true,
    );
  });

  it("maps month-days onto a season", () => {
    expect(sameDayInSeason("2026-11-21", 2017)).toBe("2017-11-21");
    expect(sameDayInSeason("2027-02-12", 2017)).toBe("2018-02-12");
    expect(sameDayInSeason("2028-02-29", 2018)).toBe("2019-02-28");
  });
});
