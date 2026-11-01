import type { HillId, IsoDate, UserPrefs } from "@/engine/types";
import type { Db } from "./db";
import { countLogged, type ActionResult } from "./settings";

export interface LogEntry {
  id: number;
  date: IsoDate;
  hill: HillId;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const NAMES: Record<HillId, string> = { whistler: "Whistler", baker: "Baker" };

export function listLog(db: Db, userId: string): LogEntry[] {
  return db
    .prepare("SELECT id, date, hill FROM ski_log WHERE user_id = ? ORDER BY date DESC")
    .all(userId) as LogEntry[];
}

export function logDay(
  db: Db,
  userId: string,
  prefs: UserPrefs,
  today: IsoDate,
  date: string,
  hill: string,
): ActionResult {
  if (hill !== "whistler" && hill !== "baker") return { ok: false, error: "Choose Whistler or Baker" };
  if (!ISO_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return { ok: false, error: "Choose a date" };
  }
  if (date > today) return { ok: false, error: "You can only log days that have happened" };
  if (date < prefs.firstSkiDay || date > prefs.lastSkiDay) {
    return {
      ok: false,
      error: `That date is outside your season (${prefs.firstSkiDay} to ${prefs.lastSkiDay})`,
    };
  }
  const open = hill === "whistler" ? prefs.whistlerOpenDate : prefs.bakerOpenDate;
  if (date < open) return { ok: false, error: `${NAMES[hill]} wasn't open yet on ${date} (opens ${open})` };
  if (db.prepare("SELECT 1 FROM ski_log WHERE user_id = ? AND date = ?").get(userId, date)) {
    return { ok: false, error: `You already logged ${date}` };
  }
  const used = countLogged(db, userId, prefs.firstSkiDay, prefs.lastSkiDay)[hill];
  const allowance = hill === "whistler" ? prefs.whistlerDays : prefs.bakerDays;
  if (used + 1 > allowance) return { ok: false, error: `No ${NAMES[hill]} days left` };
  db.prepare("INSERT INTO ski_log (user_id, date, hill, created_at) VALUES (?, ?, ?, ?)").run(
    userId,
    date,
    hill,
    new Date().toISOString(),
  );
  return { ok: true };
}

export function undoDay(db: Db, userId: string, id: number): ActionResult {
  const res = db.prepare("DELETE FROM ski_log WHERE id = ? AND user_id = ?").run(id, userId);
  return res.changes === 1 ? { ok: true } : { ok: false, error: "That day isn't in your log" };
}
