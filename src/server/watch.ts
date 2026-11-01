import type { HillId, IsoDate } from "@/engine/types";
import type { Db } from "./db";
import type { ActionResult } from "./settings";

export interface WatchEntry {
  date: IsoDate;
  hill: HillId | null;
}

export function listWatch(db: Db, userId: string): WatchEntry[] {
  return db.prepare("SELECT date, hill FROM watch WHERE user_id = ? ORDER BY date").all(userId) as WatchEntry[];
}

/** Stars or unstars a weekend (by its Saturday), for one hill or, with a null hill, the whole weekend. */
export function toggleWatch(db: Db, userId: string, saturday: string, hill: string | null): ActionResult {
  const d = new Date(`${saturday}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(saturday) || Number.isNaN(d.getTime()) || d.getUTCDay() !== 6) {
    return { ok: false, error: "Choose a weekend" };
  }
  if (hill !== null && hill !== "whistler" && hill !== "baker") return { ok: false, error: "Choose a hill" };
  const existing = db
    .prepare("SELECT rowid FROM watch WHERE user_id = ? AND date = ? AND hill IS ?")
    .get(userId, saturday, hill);
  if (existing) {
    db.prepare("DELETE FROM watch WHERE user_id = ? AND date = ? AND hill IS ?").run(userId, saturday, hill);
  } else {
    db.prepare("INSERT INTO watch (user_id, date, hill, created_at) VALUES (?, ?, ?, ?)").run(
      userId,
      saturday,
      hill,
      new Date().toISOString(),
    );
  }
  return { ok: true };
}
