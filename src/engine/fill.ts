import { vancouverLocal, type Hourly, type HourlyVariable } from "./aggregate";
import type { IsoDate } from "./types";

/**
 * Previous-runs hourly block. Lead 0 is the plain variable name (`snowfall`);
 * leads 1 to 4 are `<var>_previous_day1` to `<var>_previous_day4`.
 */
export type PreviousRunsHourly = {
  time: string[];
  [variable: string]: (number | null)[] | string[] | undefined;
};

export type DecisionDay = "wednesday" | "friday";

export const HOURLY_VARIABLES: HourlyVariable[] = [
  "snowfall",
  "rain",
  "temperature_2m",
  "wind_speed_10m",
  "cloud_cover",
];
export const MAX_LEAD = 4;

export function leadVariable(variable: HourlyVariable, lead: number): string {
  return lead === 0 ? variable : `${variable}_previous_day${lead}`;
}

/** Value at the wanted lead, else the nearest shorter lead with data, down to 0. */
export function pickLead(valuesByLead: (number | null | undefined)[], wanted: number): number | null {
  for (let lead = Math.min(wanted, valuesByLead.length - 1); lead >= 0; lead--) {
    const v = valuesByLead[lead];
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

/** One forecast view: each hour's value at lead offsetForHour(local date), clamped to 0..4, filled by pickLead. */
export function buildView(
  resp: PreviousRunsHourly,
  offsetForHour: (localDate: IsoDate) => number,
): Hourly {
  const columns = HOURLY_VARIABLES.map((variable) =>
    Array.from({ length: MAX_LEAD + 1 }, (_, lead) => resp[leadVariable(variable, lead)] as (number | null)[] | undefined),
  );
  const view: Hourly = {
    time: resp.time,
    snowfall: [],
    rain: [],
    temperature_2m: [],
    wind_speed_10m: [],
    cloud_cover: [],
  };
  resp.time.forEach((time, i) => {
    const offset = Math.max(0, Math.min(MAX_LEAD, offsetForHour(vancouverLocal(time).date)));
    HOURLY_VARIABLES.forEach((variable, v) => {
      view[variable].push(pickLead(columns[v].map((column) => column?.[i]), offset));
    });
  });
  return view;
}

const DAY_MS = 86_400_000;
const dayMs = (date: IsoDate) => Date.parse(`${date}T00:00:00Z`);

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(dayMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((dayMs(to) - dayMs(from)) / DAY_MS);
}

/** The Wednesday or Friday on or before a target day. */
export function decisionDate(target: IsoDate, decision: DecisionDay): IsoDate {
  const weekday = new Date(dayMs(target)).getUTCDay();
  const decisionWeekday = decision === "wednesday" ? 3 : 5;
  return addDays(target, -((weekday - decisionWeekday + 7) % 7));
}

/** Lead offset for an hour: calendar days from the decision day to the hour's local date; earlier hours use 0. */
export function viewOffset(target: IsoDate, decision: DecisionDay): (localDate: IsoDate) => number {
  const from = decisionDate(target, decision);
  return (localDate) => Math.max(0, daysBetween(from, localDate));
}
