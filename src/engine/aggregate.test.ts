import { describe, expect, it } from "vitest";
import { aggregateDay, aggregateRange, vancouverLocal, type Hourly } from "./aggregate";

const HOUR_MS = 3_600_000;

type Values = Partial<Record<Exclude<keyof Hourly, "time">, (time: string) => number | null>>;

function series(startUtc: string, endUtc: string, values: Values): Hourly {
  const out: Hourly = {
    time: [],
    snowfall: [],
    rain: [],
    temperature_2m: [],
    wind_speed_10m: [],
    cloud_cover: [],
  };
  for (let t = Date.parse(`${startUtc}:00Z`); t <= Date.parse(`${endUtc}:00Z`); t += HOUR_MS) {
    const time = new Date(t).toISOString().slice(0, 16);
    out.time.push(time);
    out.snowfall.push(values.snowfall?.(time) ?? 0);
    out.rain.push(values.rain?.(time) ?? 0);
    out.temperature_2m.push(values.temperature_2m?.(time) ?? 0);
    out.wind_speed_10m.push(values.wind_speed_10m?.(time) ?? 0);
    out.cloud_cover.push(values.cloud_cover?.(time) ?? 0);
  }
  return out;
}

const at = (marks: Record<string, number>, otherwise = 0) => (time: string) => marks[time] ?? otherwise;
const localHour = (time: string) => vancouverLocal(time).hour;

/** January, so Vancouver is UTC-8: 17:00 UTC is 09:00 local. */
const summit = () =>
  series("2026-01-06T00:00", "2026-01-12T23:00", {
    snowfall: at({
      "2026-01-07T16:00": 8, // 08:00 Jan 7, just before the snow72 window
      "2026-01-07T17:00": 16, // 09:00 Jan 7, first snow72 hour
      "2026-01-09T17:00": 4, // 09:00 Jan 9, first snow24 hour
      "2026-01-10T16:00": 2, // 08:00 Jan 10, last snow24 hour
      "2026-01-10T17:00": 1, // 09:00 Jan 10, first ski hour
      "2026-01-10T23:00": 64, // 15:00 Jan 10, last ski hour
      "2026-01-11T00:00": 32, // 16:00 Jan 10, after the ski window
    }),
    wind_speed_10m: at(
      { "2026-01-10T11:00": 50, "2026-01-10T20:00": 30, "2026-01-11T00:00": 99 },
      10,
    ),
    cloud_cover: (time) => localHour(time) * 5,
  });

const base = () =>
  series("2026-01-06T00:00", "2026-01-12T23:00", {
    rain: (time) => (localHour(time) === 16 ? 100 : 1),
    temperature_2m: (time) => localHour(time) - 10,
  });

const mid = () =>
  series("2026-01-06T00:00", "2026-01-12T23:00", {
    temperature_2m: () => -3.04,
  });

describe("aggregateDay", () => {
  it("buckets UTC hours into Vancouver days and sums each window", () => {
    expect(vancouverLocal("2026-01-10T17:00")).toEqual({ date: "2026-01-10", hour: 9 });
    expect(aggregateDay({ summit: summit(), low: { base: base(), mid: mid() } }, "2026-01-10")).toEqual({
      snow24: 6,
      snow72: 22,
      // 09:00 to 16:00 is hours 09..15, 7 values: rain 1 each, the 100 at 16:00 left out.
      low: { base: { rain: 7, tempMax: 5 }, mid: { rain: 0, tempMax: -3 } },
      windSummitMax: 30,
      windSummitOvernightMax: 50,
      cloudMean: 60,
      snowSkiHours: 65,
    });
  });

  it("returns null when an hour in the 09:00-16:00 window is null", () => {
    const s = summit();
    s.cloud_cover[s.time.indexOf("2026-01-10T20:00")] = null;
    expect(aggregateDay({ summit: s, low: {} }, "2026-01-10")).toBeNull();
  });

  it("returns null when a low band hour is null", () => {
    const b = base();
    b.rain[b.time.indexOf("2026-01-10T18:00")] = null;
    expect(aggregateDay({ summit: summit(), low: { base: b } }, "2026-01-10")).toBeNull();
  });

  it("returns null when the snow72 window runs before the data", () => {
    expect(aggregateDay({ summit: summit(), low: {} }, "2026-01-08")).toBeNull();
    expect(aggregateDay({ summit: summit(), low: {} }, "2026-01-09")).not.toBeNull();
  });

  it("uses 24 real hours for snow24 across the November DST change", () => {
    const s = series("2025-10-29T00:00", "2025-11-03T23:00", { snowfall: () => 1 });
    const day = aggregateDay({ summit: s, low: {} }, "2025-11-02");
    expect(day?.snow24).toBe(24);
    expect(day?.snow72).toBe(72);
  });
});

describe("aggregateRange", () => {
  it("skips days that can't be filled", () => {
    const s = summit();
    s.cloud_cover[s.time.indexOf("2026-01-10T20:00")] = null;
    const out = aggregateRange({ summit: s, low: {} }, ["2026-01-08", "2026-01-09", "2026-01-10", "2026-01-11"]);
    expect(Object.keys(out)).toEqual(["2026-01-09", "2026-01-11"]);
  });
});
