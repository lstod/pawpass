import { DEFAULT_PREFS, type DaysLeft, type IsoDate, type UserPrefs } from "@/engine/types";
import type { Db } from "./db";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SettingsInput = Partial<Record<keyof UserPrefs, string | number | null>>;

interface SettingsRow {
  user_id: string;
  whistler_days: number;
  baker_days: number;
  first_ski_day: string;
  last_ski_day: string;
  whistler_open_date: string;
  baker_open_date: string;
  whistler_low_band: string;
  visibility_pref: string;
  dog_floor: number;
  baker_travel_penalty: number;
  avy_penalty_whistler: number;
  avy_penalty_baker: number;
  baker_ticket_usd: number | null;
  onboarded_at: string | null;
  is_demo: number;
}

export interface StoredSettings {
  prefs: UserPrefs;
  onboardedAt: string | null;
  isDemo: boolean;
}

function rowToPrefs(r: SettingsRow): UserPrefs {
  return {
    whistlerDays: r.whistler_days,
    bakerDays: r.baker_days,
    firstSkiDay: r.first_ski_day,
    lastSkiDay: r.last_ski_day,
    whistlerOpenDate: r.whistler_open_date,
    bakerOpenDate: r.baker_open_date,
    whistlerLowBand: r.whistler_low_band as UserPrefs["whistlerLowBand"],
    visibilityPref: r.visibility_pref as UserPrefs["visibilityPref"],
    dogFloor: r.dog_floor,
    bakerTravelPenalty: r.baker_travel_penalty,
    avyPenaltyWhistler: r.avy_penalty_whistler,
    avyPenaltyBaker: r.avy_penalty_baker,
    bakerTicketUsd: r.baker_ticket_usd,
  };
}

const UPSERT = `
INSERT INTO settings (user_id, whistler_days, baker_days, first_ski_day, last_ski_day,
  whistler_open_date, baker_open_date, whistler_low_band, visibility_pref, dog_floor,
  baker_travel_penalty, avy_penalty_whistler, avy_penalty_baker, baker_ticket_usd, is_demo)
VALUES (@userId, @whistlerDays, @bakerDays, @firstSkiDay, @lastSkiDay, @whistlerOpenDate,
  @bakerOpenDate, @whistlerLowBand, @visibilityPref, @dogFloor, @bakerTravelPenalty,
  @avyPenaltyWhistler, @avyPenaltyBaker, @bakerTicketUsd, @isDemo)
ON CONFLICT (user_id) DO UPDATE SET
  whistler_days = excluded.whistler_days, baker_days = excluded.baker_days,
  first_ski_day = excluded.first_ski_day, last_ski_day = excluded.last_ski_day,
  whistler_open_date = excluded.whistler_open_date, baker_open_date = excluded.baker_open_date,
  whistler_low_band = excluded.whistler_low_band, visibility_pref = excluded.visibility_pref,
  dog_floor = excluded.dog_floor, baker_travel_penalty = excluded.baker_travel_penalty,
  avy_penalty_whistler = excluded.avy_penalty_whistler, avy_penalty_baker = excluded.avy_penalty_baker,
  baker_ticket_usd = excluded.baker_ticket_usd`;

/** Writes prefs; is_demo is only ever set on insert, never changed by a save. */
export function writePrefs(db: Db, userId: string, prefs: UserPrefs, isDemo = false): void {
  db.prepare(UPSERT).run({ userId, ...prefs, isDemo: isDemo ? 1 : 0 });
}

export function getSettings(db: Db, userId: string): StoredSettings {
  let row = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId) as
    | SettingsRow
    | undefined;
  if (!row) {
    writePrefs(db, userId, DEFAULT_PREFS);
    row = db.prepare("SELECT * FROM settings WHERE user_id = ?").get(userId) as SettingsRow;
  }
  return { prefs: rowToPrefs(row), onboardedAt: row.onboarded_at, isDemo: row.is_demo === 1 };
}

export function setOnboarded(db: Db, userId: string, at: string): void {
  getSettings(db, userId);
  db.prepare("UPDATE settings SET onboarded_at = ? WHERE user_id = ?").run(at, userId);
}

export function countLogged(db: Db, userId: string, first: IsoDate, last: IsoDate): DaysLeft {
  const rows = db
    .prepare(
      "SELECT hill, COUNT(*) AS n FROM ski_log WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY hill",
    )
    .all(userId, first, last) as { hill: string; n: number }[];
  const out: DaysLeft = { whistler: 0, baker: 0 };
  for (const r of rows) if (r.hill === "whistler" || r.hill === "baker") out[r.hill] = r.n;
  return out;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_DATE = "2000-01-01";
const MAX_DATE = "2100-12-31";

function isRealDate(s: string): boolean {
  if (!ISO_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function dayDiff(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

class Invalid extends Error {}

function int(value: unknown, min: number, max: number, message: string): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) throw new Invalid(message);
  return n;
}

function date(value: unknown, name: string): IsoDate {
  const s = typeof value === "string" ? value.trim() : "";
  if (!isRealDate(s) || s < MIN_DATE || s > MAX_DATE) {
    throw new Invalid(`${name} must be a date between 2000 and 2100`);
  }
  return s;
}

function pick<T>(input: SettingsInput, key: keyof UserPrefs, current: T): unknown {
  return Object.prototype.hasOwnProperty.call(input, key) ? input[key] : current;
}

/**
 * Validates a settings change against the current prefs. Never clamps: any out-of-range
 * value rejects the whole save with a message naming the field.
 */
export function validateSettings(
  input: SettingsInput,
  current: UserPrefs,
  logged: (first: IsoDate, last: IsoDate) => DaysLeft,
): { ok: true; prefs: UserPrefs } | { ok: false; error: string } {
  try {
    const firstSkiDay = date(pick(input, "firstSkiDay", current.firstSkiDay), "First ski day");
    const lastSkiDay = date(pick(input, "lastSkiDay", current.lastSkiDay), "Last ski day");
    if (lastSkiDay <= firstSkiDay) throw new Invalid("Last ski day must be after your first ski day");
    if (dayDiff(firstSkiDay, lastSkiDay) > 366) {
      throw new Invalid("Last ski day must be within a year of your first ski day");
    }
    const whistlerOpenDate = date(pick(input, "whistlerOpenDate", current.whistlerOpenDate), "Whistler opening date");
    if (whistlerOpenDate > lastSkiDay) {
      throw new Invalid("Whistler opening date must be on or before your last ski day");
    }
    const bakerOpenDate = date(pick(input, "bakerOpenDate", current.bakerOpenDate), "Baker opening date");
    if (bakerOpenDate > lastSkiDay) {
      throw new Invalid("Baker opening date must be on or before your last ski day");
    }

    const done = logged(firstSkiDay, lastSkiDay);
    const whistlerDays = int(pick(input, "whistlerDays", current.whistlerDays), 0, 20, "Whistler days must be between 0 and 20");
    if (whistlerDays < done.whistler) {
      throw new Invalid(`You've already logged ${done.whistler} Whistler days`);
    }
    const bakerDays = int(pick(input, "bakerDays", current.bakerDays), 0, 10, "Baker days must be between 0 and 10");
    if (bakerDays < done.baker) {
      throw new Invalid(`You've already logged ${done.baker} Baker days`);
    }

    const band = pick(input, "whistlerLowBand", current.whistlerLowBand);
    if (band !== "base" && band !== "mid") throw new Invalid("Whistler terrain must be base or mid-mountain");
    const vis = pick(input, "visibilityPref", current.visibilityPref);
    if (vis !== "powder" && vis !== "balanced" && vis !== "bluebird") {
      throw new Invalid("Visibility must be one of powder, balanced or bluebird");
    }

    const dogFloor = int(pick(input, "dogFloor", current.dogFloor), 0, 100, "Dog floor must be between 0 and 100");
    const bakerTravelPenalty = int(
      pick(input, "bakerTravelPenalty", current.bakerTravelPenalty), 0, 50,
      "Baker travel penalty must be between 0 and 50",
    );
    const avyPenaltyWhistler = int(
      pick(input, "avyPenaltyWhistler", current.avyPenaltyWhistler), 0, 50,
      "Avalanche-control penalty must be between 0 and 50",
    );
    const avyPenaltyBaker = int(
      pick(input, "avyPenaltyBaker", current.avyPenaltyBaker), 0, 50,
      "Avalanche-control penalty must be between 0 and 50",
    );

    const ticket = pick(input, "bakerTicketUsd", current.bakerTicketUsd);
    const bakerTicketUsd =
      ticket === null || ticket === undefined || (typeof ticket === "string" && ticket.trim() === "")
        ? null
        : int(ticket, 0, 500, "Baker ticket must be between 0 and 500");

    return {
      ok: true,
      prefs: {
        whistlerDays, bakerDays, firstSkiDay, lastSkiDay, whistlerOpenDate, bakerOpenDate,
        whistlerLowBand: band, visibilityPref: vis, dogFloor, bakerTravelPenalty,
        avyPenaltyWhistler, avyPenaltyBaker, bakerTicketUsd,
      },
    };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}

export function saveSettings(db: Db, userId: string, input: SettingsInput): ActionResult {
  const { prefs, isDemo } = getSettings(db, userId);
  const result = validateSettings(input, prefs, (first, last) => countLogged(db, userId, first, last));
  if (!result.ok) return result;
  writePrefs(db, userId, result.prefs, isDemo);
  return { ok: true };
}
