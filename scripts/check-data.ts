import { readFileSync } from "node:fs";
import { addDays } from "../src/engine/fill";
import { HILL_IDS, HILLS, LIVE_SEASONS, REPLAY_END, REPLAY_START } from "../src/engine/hills";
import type { DayWeather, IsoDate, WeatherByDate } from "../src/engine/types";

const failures: string[] = [];
const fail = (message: string) => failures.push(message);

function load(path: string): WeatherByDate {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as WeatherByDate;
  } catch (err) {
    fail(`${path}: ${err instanceof Error ? err.message : err}`);
    return {};
  }
}

function datesBetween(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isWeekend = (date: IsoDate) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());

const weekends = datesBetween(REPLAY_START, REPLAY_END).filter(isWeekend);
let forecastDays = 0;
for (const hill of HILL_IDS) {
  for (const suffix of ["", "-friday"]) {
    const path = `data/forecast-2025-26-${hill}${suffix}.json`;
    const days = load(path);
    for (const date of weekends) {
      const day: DayWeather | undefined = days[date];
      if (!day) {
        fail(`${path}: missing ${date}`);
        continue;
      }
      const bad = [
        ...(isNumber(day.snow72) ? [] : ["snow72"]),
        ...(isNumber(day.cloudMean) ? [] : ["cloudMean"]),
        ...HILLS[hill].lowBands.filter((b) => !isNumber(day.low?.[b.id]?.rain)).map((b) => `low.${b.id}.rain`),
      ];
      if (bad.length) fail(`${path}: ${date} has no ${bad.join(", ")}`);
      else forecastDays++;
    }
  }
}

const seasonDates = LIVE_SEASONS.flatMap((year) => datesBetween(`${year}-11-01`, `${year + 1}-04-30`));
let actualDays = 0;
for (const hill of HILL_IDS) {
  const path = `data/actual-${hill}.json`;
  const days = load(path);
  for (const date of seasonDates) {
    if (days[date]) actualDays++;
    else fail(`${path}: missing ${date}`);
  }
}

for (const message of failures.slice(0, 50)) console.error(message);
const summary = `forecast weekend days ok ${forecastDays}/${weekends.length * 4}, actual days ok ${actualDays}/${seasonDates.length * 2}`;
if (failures.length) {
  console.error(`check-data FAILED (${failures.length} problems): ${summary}`);
  process.exit(1);
}
console.log(`check-data ok: ${summary}`);
