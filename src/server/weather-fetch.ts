import { aggregateRange, localDates, type HillSeries, type Hourly } from "../engine/aggregate";
import { HOURLY_VARIABLES, leadVariable, MAX_LEAD, type PreviousRunsHourly } from "../engine/fill";
import { HILL_IDS, HILLS } from "../engine/hills";
import type { HillId, IsoDate, LowBandId, WeatherByDate } from "../engine/types";

export type FetchFn = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
export const PREVIOUS_RUNS_URL = "https://previous-runs-api.open-meteo.com/v1/forecast";
export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const PREVIOUS_RUNS_VARIABLES = HOURLY_VARIABLES.flatMap((variable) =>
  Array.from({ length: MAX_LEAD + 1 }, (_, lead) => leadVariable(variable, lead)),
);

export function buildUrl(
  endpoint: string,
  hill: HillId,
  elevation: number,
  hourly: string[],
  extra: Record<string, string | number>,
): string {
  const { lat, lon } = HILLS[hill];
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    elevation: String(elevation),
    hourly: hourly.join(","),
    models: "ecmwf_ifs",
    timezone: "UTC",
  });
  for (const [key, value] of Object.entries(extra)) params.set(key, String(value));
  return `${endpoint}?${params.toString()}`;
}

/** GETs JSON, retrying a network error or non-ok response once. */
export async function fetchJson(url: string, fetchFn: FetchFn): Promise<unknown> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchFn(url);
      if (res.ok) return await res.json();
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`Request failed twice (${lastError}): ${url}`);
}

function hourlyBlock(body: unknown, url: string): Record<string, unknown> & { time: string[] } {
  const hourly = (body as { hourly?: { time?: unknown } } | null)?.hourly;
  if (!hourly || !Array.isArray(hourly.time)) throw new Error(`No hourly data in response: ${url}`);
  return hourly as Record<string, unknown> & { time: string[] };
}

function toHourly(body: unknown, url: string): Hourly {
  const block = hourlyBlock(body, url);
  const column = (name: string) => {
    const values = block[name];
    if (!Array.isArray(values)) throw new Error(`Missing hourly ${name}: ${url}`);
    return values as (number | null)[];
  };
  return {
    time: block.time,
    snowfall: column("snowfall"),
    rain: column("rain"),
    temperature_2m: column("temperature_2m"),
    wind_speed_10m: column("wind_speed_10m"),
    cloud_cover: column("cloud_cover"),
  };
}

export async function fetchArchive(
  hill: HillId,
  elevation: number,
  start: IsoDate,
  end: IsoDate,
  fetchFn: FetchFn,
): Promise<Hourly> {
  const url = buildUrl(ARCHIVE_URL, hill, elevation, HOURLY_VARIABLES, { start_date: start, end_date: end });
  return toHourly(await fetchJson(url, fetchFn), url);
}

export async function fetchPreviousRuns(
  hill: HillId,
  elevation: number,
  start: IsoDate,
  end: IsoDate,
  fetchFn: FetchFn,
): Promise<PreviousRunsHourly> {
  const url = buildUrl(PREVIOUS_RUNS_URL, hill, elevation, PREVIOUS_RUNS_VARIABLES, {
    start_date: start,
    end_date: end,
  });
  return hourlyBlock(await fetchJson(url, fetchFn), url) as PreviousRunsHourly;
}

/** Fetches a hill's summit and every low band, each as its own elevation. */
export async function fetchHillSeries(
  hill: HillId,
  fetchElevation: (elevation: number) => Promise<Hourly>,
): Promise<HillSeries> {
  const { summitElevation, lowBands } = HILLS[hill];
  const summit = await fetchElevation(summitElevation);
  const low: Partial<Record<LowBandId, Hourly>> = {};
  for (const band of lowBands) low[band.id] = await fetchElevation(band.elevation);
  return { summit, low };
}

/** Live ECMWF forecast for both hills. Days with any null hour in their windows are left out. */
const FETCH_TIMEOUT_MS = 30_000;

const fetchWithTimeout: FetchFn = (url) => fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

export async function fetchLiveForecast(fetchFn: FetchFn = fetchWithTimeout): Promise<Record<HillId, WeatherByDate>> {
  const out = {} as Record<HillId, WeatherByDate>;
  for (const hill of HILL_IDS) {
    const series = await fetchHillSeries(hill, async (elevation) => {
      const url = buildUrl(FORECAST_URL, hill, elevation, HOURLY_VARIABLES, { past_days: 3, forecast_days: 16 });
      return toHourly(await fetchJson(url, fetchFn), url);
    });
    out[hill] = aggregateRange(series, localDates(series.summit));
  }
  return out;
}
