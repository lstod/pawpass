import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFS } from "@/engine/types";
import { openDb, type Db } from "./db";
import { listLog, logDay, undoDay } from "./log";
import { createAppTables } from "./schema";

const prefs = { ...DEFAULT_PREFS, whistlerDays: 2, bakerDays: 1 };
const today = "2026-12-20";
let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
  createAppTables(db);
});

describe("logDay", () => {
  it("logs a past in-season day, on any day of the week", () => {
    expect(logDay(db, "u1", prefs, today, "2026-12-02", "whistler")).toEqual({ ok: true });
    expect(logDay(db, "u1", prefs, today, today, "baker")).toEqual({ ok: true });
    expect(listLog(db, "u1").map((e) => e.date)).toEqual([today, "2026-12-02"]);
  });

  it.each([
    ["2026-12-21", "whistler", "You can only log days that have happened"],
    ["2026-11-20", "whistler", "That date is outside your season (2026-11-21 to 2027-04-10)"],
    ["2026-12-04", "baker", "Baker wasn't open yet on 2026-12-04 (opens 2026-12-05)"],
    ["2026-12-05", "snowmobile", "Choose Whistler or Baker"],
  ])("rejects %s at %s", (date, hill, error) => {
    expect(logDay(db, "u1", prefs, today, date, hill)).toEqual({ ok: false, error });
    expect(listLog(db, "u1")).toHaveLength(0);
  });

  it("rejects a second entry for the same date", () => {
    logDay(db, "u1", prefs, today, "2026-11-28", "whistler");
    expect(logDay(db, "u1", prefs, today, "2026-11-28", "whistler")).toEqual({
      ok: false,
      error: "You already logged 2026-11-28",
    });
  });

  it("rejects an entry that would take days left below zero", () => {
    logDay(db, "u1", prefs, today, "2026-12-06", "baker");
    expect(logDay(db, "u1", prefs, today, "2026-12-07", "baker")).toEqual({ ok: false, error: "No Baker days left" });
  });
});

describe("undoDay", () => {
  it("only removes the signed-in user's rows", () => {
    logDay(db, "u1", prefs, today, "2026-12-02", "whistler");
    const [entry] = listLog(db, "u1");
    expect(undoDay(db, "u2", entry.id)).toEqual({ ok: false, error: "That day isn't in your log" });
    expect(listLog(db, "u1")).toHaveLength(1);
    expect(undoDay(db, "u1", entry.id)).toEqual({ ok: true });
    expect(listLog(db, "u1")).toHaveLength(0);
  });

  it("keeps each user's log separate", () => {
    logDay(db, "u1", prefs, today, "2026-12-02", "whistler");
    expect(logDay(db, "u2", prefs, today, "2026-12-02", "whistler")).toEqual({ ok: true });
    expect(listLog(db, "u2")).toHaveLength(1);
  });
});
