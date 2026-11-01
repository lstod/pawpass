import { mkdirSync, writeFileSync } from "node:fs";
import { aggregateDay, aggregateRange, type HillSeries } from "../src/engine/aggregate";
import { addDays, buildView, viewOffset, type DecisionDay, type PreviousRunsHourly } from "../src/engine/fill";
import { HILL_IDS, HILLS, LIVE_SEASONS, REPLAY_END, REPLAY_START } from "../src/engine/hills";
import type { HillId, IsoDate, LowBandId, WeatherByDate } from "../src/engine/types";
import { fetchArchive, fetchHillSeries, fetchPreviousRuns, type FetchFn } from "../src/server/weather-fetch";

const PAUSE_MS = 200;
const DECISIONS: DecisionDay[] = ["wednesday", "friday"];

/** Three days before Nov 1, so the first days' snow72 window is complete. */
const leadInStart = (startYear: number): IsoDate => `${startYear}-10-29`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let requests = 0;
const politeFetch: FetchFn = async (url) => {
  if (requests++ > 0) await sleep(PAUSE_MS);
  return fetch(url);
};

function datesBetween(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

const isWeekend = (date: IsoDate) => [0, 6].includes(new Date(`${date}T00:00:00Z`).getUTCDay());

function writeJson(path: string, days: WeatherByDate): void {
  const lines = Object.keys(days)
    .sort()
    .map((date) => `${JSON.stringify(date)}:${JSON.stringify(days[date])}`);
  writeFileSync(path, `{\n${lines.join(",\n")}\n}\n`);
  console.log(`wrote ${path} (${lines.length} days)`);
}

async function actuals(hill: HillId): Promise<WeatherByDate> {
  const out: WeatherByDate = {};
  for (const year of LIVE_SEASONS) {
    const end = `${year + 1}-04-30`;
    const series = await fetchHillSeries(hill, (elevation) =>
      fetchArchive(hill, elevation, leadInStart(year), end, politeFetch),
    );
    const dates = datesBetween(`${year}-11-01`, end);
    const days = aggregateRange(series, dates);
    const missing = dates.filter((d) => !days[d]);
    if (missing.length) console.warn(`${hill} ${year}-${year + 1}: no data for ${missing.join(", ")}`);
    Object.assign(out, days);
  }
  return out;
}

async function pastForecasts(hill: HillId): Promise<Record<DecisionDay, WeatherByDate>> {
  const { summitElevation, lowBands } = HILLS[hill];
  const previousRuns = (elevation: number) =>
    fetchPreviousRuns(hill, elevation, leadInStart(2025), REPLAY_END, politeFetch);
  const summit = await previousRuns(summitElevation);
  const low: Partial<Record<LowBandId, PreviousRunsHourly>> = {};
  for (const band of lowBands) low[band.id] = await previousRuns(band.elevation);

  const out: Record<DecisionDay, WeatherByDate> = { wednesday: {}, friday: {} };
  for (const decision of DECISIONS) {
    for (const target of datesBetween(REPLAY_START, REPLAY_END).filter(isWeekend)) {
      const offset = viewOffset(target, decision);
      const view: HillSeries = { summit: buildView(summit, offset), low: {} };
      for (const band of lowBands) view.low[band.id] = buildView(low[band.id]!, offset);
      const day = aggregateDay(view, target);
      if (day) out[decision][target] = day;
      else console.warn(`${hill} ${decision} view: ${target} still has nulls after the fill`);
    }
  }
  return out;
}

async function main(): Promise<void> {
  mkdirSync("data", { recursive: true });
  for (const hill of HILL_IDS) {
    writeJson(`data/actual-${hill}.json`, await actuals(hill));
  }
  for (const hill of HILL_IDS) {
    const views = await pastForecasts(hill);
    writeJson(`data/forecast-2025-26-${hill}.json`, views.wednesday);
    writeJson(`data/forecast-2025-26-${hill}-friday.json`, views.friday);
  }
  console.log(`done: ${requests} requests`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
