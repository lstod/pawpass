import type { DayWeather, IsoDate, LowBandId, LowBandWeather, WeatherByDate } from "./types";

/** Open-Meteo hourly block. `time` is UTC, "YYYY-MM-DDTHH:MM". */
export type Hourly = {
  time: string[];
  snowfall: (number | null)[];
  rain: (number | null)[];
  temperature_2m: (number | null)[];
  wind_speed_10m: (number | null)[];
  cloud_cover: (number | null)[];
};

/** One hill's hourly series: summit plus each low band, fetched at the same coordinates. */
export type HillSeries = {
  summit: Hourly;
  low: Partial<Record<LowBandId, Hourly>>;
};

export type HourlyVariable = Exclude<keyof Hourly, "time">;

const HOUR_MS = 3_600_000;
const SKI_START_HOUR = 9;
/** Hours 09:00 to 15:00 inclusive, so the 09:00-16:00 window is 7 hourly values. */
const SKI_HOURS = 7;

const vancouver = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Vancouver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

const localCache = new Map<string, { date: IsoDate; hour: number }>();
const LOCAL_CACHE_MAX = 200_000;

export function utcMs(time: string): number {
  return Date.parse(`${time}:00Z`);
}

/** Vancouver local date and hour of an Open-Meteo UTC time, from the runtime's tzdata. */
export function vancouverLocal(time: string): { date: IsoDate; hour: number } {
  const cached = localCache.get(time);
  if (cached) return cached;
  let year = "";
  let month = "";
  let day = "";
  let hour = 0;
  for (const part of vancouver.formatToParts(utcMs(time))) {
    if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") day = part.value;
    else if (part.type === "hour") hour = Number(part.value);
  }
  const local = { date: `${year}-${month}-${day}`, hour };
  if (localCache.size >= LOCAL_CACHE_MAX) localCache.clear();
  localCache.set(time, local);
  return local;
}

interface HourIndex {
  byUtc: Map<number, number>;
  /** "YYYY-MM-DD HH" local to the first index at that local hour. */
  byLocal: Map<string, number>;
}

const indexes = new WeakMap<Hourly, HourIndex>();

function indexOf(hourly: Hourly): HourIndex {
  const existing = indexes.get(hourly);
  if (existing) return existing;
  const byUtc = new Map<number, number>();
  const byLocal = new Map<string, number>();
  hourly.time.forEach((time, i) => {
    byUtc.set(utcMs(time), i);
    const { date, hour } = vancouverLocal(time);
    const key = `${date} ${hour}`;
    if (!byLocal.has(key)) byLocal.set(key, i);
  });
  const index = { byUtc, byLocal };
  indexes.set(hourly, index);
  return index;
}

/** Values of one variable at hours `from` to `to` (inclusive) relative to `t0`, or null if any is missing. */
function values(
  hourly: Hourly,
  variable: HourlyVariable,
  t0: number,
  from: number,
  to: number,
): number[] | null {
  const { byUtc } = indexOf(hourly);
  const column = hourly[variable];
  const out: number[] = [];
  for (let k = from; k <= to; k++) {
    const i = byUtc.get(t0 + k * HOUR_MS);
    if (i === undefined) return null;
    const v = column[i];
    if (v === null || v === undefined || !Number.isFinite(v)) return null;
    out.push(v);
  }
  return out;
}

function nineAm(hourly: Hourly, date: IsoDate): number | null {
  const i = indexOf(hourly).byLocal.get(`${date} ${SKI_START_HOUR}`);
  return i === undefined ? null : utcMs(hourly.time[i]);
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const max = (xs: number[]) => Math.max(...xs);

/**
 * One hill's weather for one Vancouver day. snow24 and snow72 are the 24 and 72 real hours
 * before 09:00 local, so a DST change shifts their start by an hour on the local clock.
 * Null when any hour any window needs is missing or null.
 */
export function aggregateDay(series: HillSeries, date: IsoDate): DayWeather | null {
  const { summit } = series;
  const t9 = nineAm(summit, date);
  if (t9 === null) return null;
  const ski = [0, SKI_HOURS - 1] as const;
  const snow72 = values(summit, "snowfall", t9, -72, -1);
  const snowSki = values(summit, "snowfall", t9, ...ski);
  const windOvernight = values(summit, "wind_speed_10m", t9, -24, -1);
  const windSki = values(summit, "wind_speed_10m", t9, ...ski);
  const cloud = values(summit, "cloud_cover", t9, ...ski);
  if (!snow72 || !snowSki || !windOvernight || !windSki || !cloud) return null;

  const low: Partial<Record<LowBandId, LowBandWeather>> = {};
  for (const [band, hourly] of Object.entries(series.low) as [LowBandId, Hourly | undefined][]) {
    if (!hourly) continue;
    const rain = values(hourly, "rain", t9, ...ski);
    const temp = values(hourly, "temperature_2m", t9, ...ski);
    if (!rain || !temp) return null;
    low[band] = { rain: round1(sum(rain)), tempMax: round1(max(temp)) };
  }

  return {
    snow24: round1(sum(snow72.slice(-24))),
    snow72: round1(sum(snow72)),
    low,
    windSummitMax: round1(max(windSki)),
    windSummitOvernightMax: round1(max(windOvernight)),
    cloudMean: round1(sum(cloud) / cloud.length),
    snowSkiHours: round1(sum(snowSki)),
  };
}

/** Aggregates each date, leaving out dates aggregateDay can't fill. */
export function aggregateRange(series: HillSeries, dates: IsoDate[]): WeatherByDate {
  const out: WeatherByDate = {};
  for (const date of dates) {
    const day = aggregateDay(series, date);
    if (day) out[date] = day;
  }
  return out;
}

/** Distinct Vancouver local dates covered by an hourly series, in order. */
export function localDates(hourly: Hourly): IsoDate[] {
  const dates = new Set<IsoDate>();
  for (const time of hourly.time) dates.add(vancouverLocal(time).date);
  return [...dates];
}
