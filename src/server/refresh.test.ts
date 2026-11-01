import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DayWeather, HillId, WeatherByDate } from "@/engine/types";
import { openDb, type Db } from "./db";
import { readForecastMeta, readForecasts, refreshOnce, startRefresh, stopRefresh, REFRESH_INTERVAL_MS } from "./refresh";
import { createAppTables } from "./schema";

const day: DayWeather = {
  snow24: 5,
  snow72: 20,
  low: { base: { rain: 0, tempMax: -2 }, mid: { rain: 0, tempMax: -5 } },
  windSummitMax: 20,
  windSummitOvernightMax: 25,
  cloudMean: 50,
  snowSkiHours: 1,
};
const live = (): Promise<Record<HillId, WeatherByDate>> =>
  Promise.resolve({ whistler: { "2026-11-07": day }, baker: { "2026-11-07": day } });

let db: Db;
beforeEach(() => {
  db = openDb(":memory:");
  createAppTables(db);
});
afterEach(() => {
  stopRefresh();
  vi.useRealTimers();
});

describe("refreshOnce", () => {
  it("stores parsed days and records the success time", async () => {
    expect(await refreshOnce(db, { fetchLive: live, now: () => new Date("2026-11-01T20:00:00Z") })).toBe(true);
    expect(readForecasts(db).whistler["2026-11-07"]).toEqual(day);
    expect(readForecastMeta(db).lastOkAt).toBe("2026-11-01T20:00:00.000Z");
  });

  it("leaves rows unchanged and records the error when the fetch fails", async () => {
    await refreshOnce(db, { fetchLive: live });
    const before = db.prepare("SELECT * FROM forecast_day ORDER BY hill").all();
    const lines: string[] = [];
    const ok = await refreshOnce(db, {
      fetchLive: () => Promise.reject(new Error("503 from upstream")),
      now: () => new Date("2026-11-01T21:00:00Z"),
      logError: (l) => lines.push(l),
    });
    expect(ok).toBe(false);
    expect(db.prepare("SELECT * FROM forecast_day ORDER BY hill").all()).toEqual(before);
    expect(readForecastMeta(db)).toMatchObject({ lastErrorAt: "2026-11-01T21:00:00.000Z", lastError: "503 from upstream" });
    expect(lines).toHaveLength(1);
  });
});

describe("startRefresh", () => {
  it("fetches on start and again after 60 minutes", async () => {
    vi.useFakeTimers();
    const fetchLive = vi.fn(live);
    expect(startRefresh(db, { fetchLive })).toBe(true);
    await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    expect(fetchLive).toHaveBeenCalledTimes(2);
  });

  it("doesn't start a second timer when registered twice", async () => {
    vi.useFakeTimers();
    const fetchLive = vi.fn(live);
    expect(startRefresh(db, { fetchLive })).toBe(true);
    expect(startRefresh(db, { fetchLive })).toBe(false);
    await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS);
    expect(fetchLive).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(1);
  });
});
