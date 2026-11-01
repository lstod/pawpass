import type { DayWeather, HillId, WeatherByDate } from "@/engine/types";
import type { Db } from "./db";
import { pruneDemoUsers } from "./demo";
import { fetchLiveForecast } from "./weather-fetch";

export const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

export interface RefreshDeps {
  fetchLive?: () => Promise<Record<HillId, WeatherByDate>>;
  now?: () => Date;
  logError?: (line: string) => void;
}

export interface ForecastMeta {
  lastOkAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
}

/** Fetches the live forecast once and upserts it; a failure leaves existing rows untouched. */
export async function refreshOnce(db: Db, deps: RefreshDeps = {}): Promise<boolean> {
  const now = (deps.now ?? (() => new Date()))().toISOString();
  try {
    const byHill = await (deps.fetchLive ?? (() => fetchLiveForecast()))();
    const upsert = db.prepare(
      `INSERT INTO forecast_day (hill, date, weather_json, fetched_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (hill, date) DO UPDATE SET weather_json = excluded.weather_json, fetched_at = excluded.fetched_at`,
    );
    db.transaction(() => {
      for (const hill of Object.keys(byHill) as HillId[]) {
        for (const [date, w] of Object.entries(byHill[hill])) upsert.run(hill, date, JSON.stringify(w), now);
      }
      db.prepare("UPDATE forecast_meta SET last_ok_at = ? WHERE id = 1").run(now);
    })();
    return true;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    (deps.logError ?? console.error)(`forecast refresh failed: ${message}`);
    db.prepare("UPDATE forecast_meta SET last_error_at = ?, last_error = ? WHERE id = 1").run(now, message);
    return false;
  }
}

export function readForecasts(db: Db): Record<HillId, WeatherByDate> {
  const out: Record<HillId, WeatherByDate> = { whistler: {}, baker: {} };
  const rows = db.prepare("SELECT hill, date, weather_json FROM forecast_day").all() as {
    hill: HillId;
    date: string;
    weather_json: string;
  }[];
  for (const r of rows) {
    if (r.hill in out) out[r.hill][r.date] = JSON.parse(r.weather_json) as DayWeather;
  }
  return out;
}

export function readForecastMeta(db: Db): ForecastMeta {
  const r = db.prepare("SELECT last_ok_at, last_error_at, last_error FROM forecast_meta WHERE id = 1").get() as
    | { last_ok_at: string | null; last_error_at: string | null; last_error: string | null }
    | undefined;
  return { lastOkAt: r?.last_ok_at ?? null, lastErrorAt: r?.last_error_at ?? null, lastError: r?.last_error ?? null };
}

const TIMER_KEY = Symbol.for("pawpass.refreshTimer");
type GlobalWithTimer = typeof globalThis & { [TIMER_KEY]?: ReturnType<typeof setInterval> };

const BUSY_KEY = Symbol.for("pawpass.refreshBusy");
type GlobalWithBusy = typeof globalThis & { [BUSY_KEY]?: boolean };

async function tick(db: Db, deps: RefreshDeps): Promise<void> {
  const g = globalThis as GlobalWithBusy;
  if (g[BUSY_KEY]) return;
  g[BUSY_KEY] = true;
  try {
    await refreshOnce(db, deps);
  } finally {
    g[BUSY_KEY] = false;
  }
  try {
    pruneDemoUsers(db, (deps.now ?? (() => new Date()))());
  } catch (e) {
    (deps.logError ?? console.error)(`demo prune failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Starts the hourly refresh once per process; a second call is a no-op and returns false. */
export function startRefresh(db: Db, deps: RefreshDeps = {}): boolean {
  const g = globalThis as GlobalWithTimer;
  if (g[TIMER_KEY]) return false;
  g[TIMER_KEY] = setInterval(() => void tick(db, deps), REFRESH_INTERVAL_MS);
  void tick(db, deps);
  return true;
}

export function stopRefresh(): void {
  const g = globalThis as GlobalWithTimer;
  if (g[TIMER_KEY]) clearInterval(g[TIMER_KEY]);
  delete g[TIMER_KEY];
}
