import { HILL_NAMES } from "./labels";
import type { DaysLeft, HillId, IsoDate, Loggable, UserPrefs } from "./types";

const DAY_MS = 86_400_000;
const TIME_ZONE = "America/Vancouver";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 2025-26 is the replay season: months from July belong to its start year. */
const REPLAY_SEASON_START_YEAR = 2025;
const SEASON_START_MONTH = 7;

const vancouverDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const vancouverTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toUtc(d: IsoDate): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

export function isIsoDate(d: unknown): d is IsoDate {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return fromUtc(toUtc(d)) === d;
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return fromUtc(toUtc(d) + n * DAY_MS);
}

/** b - a, in days. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** 0 = Sunday .. 6 = Saturday. */
export function dayOfWeek(d: IsoDate): number {
  return new Date(toUtc(d)).getUTCDay();
}

export function todayInVancouver(now: Date): IsoDate {
  const parts = vancouverDate.formatToParts(now);
  return `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
}

export function timeInVancouver(iso: string): string {
  const parts = vancouverTime.formatToParts(new Date(iso));
  return `${part(parts, "hour")}:${part(parts, "minute")}`;
}

/** The Saturday of the weekend a date belongs to: itself, the day before for a Sunday, else the coming one. */
export function saturdayOf(d: IsoDate): IsoDate {
  const dow = dayOfWeek(d);
  return dow === 0 ? addDays(d, -1) : addDays(d, 6 - dow);
}

export function currentWeekend(today: IsoDate): { saturday: IsoDate; days: IsoDate[] } {
  const saturday = saturdayOf(today);
  return { saturday, days: [saturday, addDays(saturday, 1)] };
}

/** Every Saturday and Sunday from first to last, inclusive. */
export function weekendDays(first: IsoDate, last: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    const dow = dayOfWeek(d);
    if (dow === 0 || dow === 6) out.push(d);
  }
  return out;
}

/** "Sat Nov 21". */
export function formatDay(d: IsoDate): string {
  const [, m, day] = d.split("-").map(Number);
  return `${WEEKDAYS[dayOfWeek(d)]} ${MONTHS[m - 1]} ${day}`;
}

/** "Fri Feb 6, 2026". */
export function formatDayWithYear(d: IsoDate): string {
  return `${formatDay(d)}, ${d.slice(0, 4)}`;
}

/** The same month-day in the 2025-26 season. Feb 29 becomes Feb 28. */
export function mapToReplaySeason(date: IsoDate): IsoDate {
  const [, m, day] = date.split("-").map(Number);
  const year = m >= SEASON_START_MONTH ? REPLAY_SEASON_START_YEAR : REPLAY_SEASON_START_YEAR + 1;
  const mm = String(m).padStart(2, "0");
  const candidate = `${year}-${mm}-${String(day).padStart(2, "0")}`;
  return isIsoDate(candidate) ? candidate : `${year}-${mm}-28`;
}

export function hillOpenOn(date: IsoDate, hill: HillId, prefs: UserPrefs): boolean {
  const openDate = hill === "whistler" ? prefs.whistlerOpenDate : prefs.bakerOpenDate;
  return date >= prefs.firstSkiDay && date <= prefs.lastSkiDay && date >= openDate;
}

export function loggable(
  date: IsoDate,
  hill: HillId,
  today: IsoDate,
  prefs: UserPrefs,
  daysLeft: DaysLeft,
): Loggable {
  const name = HILL_NAMES[hill];
  const openDate = hill === "whistler" ? prefs.whistlerOpenDate : prefs.bakerOpenDate;
  if (date < prefs.firstSkiDay) {
    return {
      ok: false,
      reason: `You can log days from ${formatDay(prefs.firstSkiDay)}, your first ski day, once they've happened.`,
    };
  }
  if (date > prefs.lastSkiDay) {
    return { ok: false, reason: `${formatDay(date)} is after your last ski day.` };
  }
  if (date < openDate) {
    return { ok: false, reason: `${name} isn't open until ${formatDay(openDate)}.` };
  }
  if (date > today) {
    return {
      ok: false,
      reason: `You can log days that have happened. Come back on ${formatDay(date)}.`,
    };
  }
  if (daysLeft[hill] <= 0) return { ok: false, reason: `No ${name} days left.` };
  return { ok: true };
}
