import { beforeEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "./db";
import { createAppTables } from "./schema";
import { listWatch, toggleWatch } from "./watch";

let db: Db;

beforeEach(() => {
  db = openDb(":memory:");
  createAppTables(db);
});

describe("toggleWatch", () => {
  it("stars and unstars a whole weekend", () => {
    expect(toggleWatch(db, "u1", "2027-01-09", null)).toEqual({ ok: true });
    expect(listWatch(db, "u1")).toEqual([{ date: "2027-01-09", hill: null }]);
    toggleWatch(db, "u1", "2027-01-09", null);
    expect(listWatch(db, "u1")).toEqual([]);
  });

  it("stars one hill separately from the whole weekend", () => {
    toggleWatch(db, "u1", "2027-01-09", null);
    toggleWatch(db, "u1", "2027-01-09", "baker");
    expect(listWatch(db, "u1")).toHaveLength(2);
    toggleWatch(db, "u1", "2027-01-09", "baker");
    expect(listWatch(db, "u1")).toEqual([{ date: "2027-01-09", hill: null }]);
  });

  it("only touches the signed-in user's rows", () => {
    toggleWatch(db, "u1", "2027-01-09", null);
    toggleWatch(db, "u2", "2027-01-09", null);
    expect(listWatch(db, "u1")).toHaveLength(1);
    expect(listWatch(db, "u2")).toHaveLength(1);
  });

  it("rejects a date that isn't a Saturday and an unknown hill", () => {
    expect(toggleWatch(db, "u1", "2027-01-10", null)).toEqual({ ok: false, error: "Choose a weekend" });
    expect(toggleWatch(db, "u1", "2027-01-09", "cypress")).toEqual({ ok: false, error: "Choose a hill" });
  });
});
