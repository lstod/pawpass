import { scoreDay } from "./score";
import { addDays, isIsoDate } from "./time";
import type { HillId, IsoDate, Sample, UserPrefs, WeatherByDate } from "./types";

export const SAMPLE_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];

/** Months from July belong to the season that starts that year. */
const SEASON_START_MONTH = 7;

/** The same month-day as `date` in the season starting in `seasonYear`. Feb 29 becomes Feb 28. */
export function sameDayInSeason(date: IsoDate, seasonYear: number): IsoDate {
  const [, m, day] = date.split("-").map(Number);
  const year = m >= SEASON_START_MONTH ? seasonYear : seasonYear + 1;
  const mm = String(m).padStart(2, "0");
  const candidate = `${year}-${mm}-${String(day).padStart(2, "0")}`;
  return isIsoDate(candidate) ? candidate : `${year}-${mm}-28`;
}

/** Scores each historical date once per call site. */
export function scoreCache(prefs: UserPrefs, actuals: Record<HillId, WeatherByDate>) {
  const cache = new Map<IsoDate, Sample | null>();
  return (date: IsoDate): Sample | null => {
    let s = cache.get(date);
    if (s === undefined) {
      const w = actuals.whistler[date];
      const b = actuals.baker[date];
      s = w && b ? { w: scoreDay(w, "whistler", prefs).score, b: scoreDay(b, "baker", prefs).score } : null;
      cache.set(date, s);
    }
    return s;
  };
}

/**
 * One entry per season x offset, season-major, in a fixed order; null where either hill has no data.
 * These are the forward simulation's paths.
 */
export function pathSamples(
  date: IsoDate,
  seasons: number[],
  score: (date: IsoDate) => Sample | null,
): (Sample | null)[] {
  const out: (Sample | null)[] = [];
  for (const season of seasons) {
    const center = sameDayInSeason(date, season);
    for (const offset of SAMPLE_OFFSETS) out.push(score(addDays(center, offset)));
  }
  return out;
}

export function samplesFor(
  date: IsoDate,
  seasons: number[],
  prefs: UserPrefs,
  actuals: Record<HillId, WeatherByDate>,
): Sample[] {
  return pathSamples(date, seasons, scoreCache(prefs, actuals)).filter((s): s is Sample => s !== null);
}
