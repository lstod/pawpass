import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFS } from "@/engine/types";
import { openDb, type Db } from "./db";
import { createAppTables } from "./schema";
import { getSettings, saveSettings, validateSettings, type SettingsInput } from "./settings";

const none = () => ({ whistler: 0, baker: 0 });

function check(input: SettingsInput, logged = none) {
  return validateSettings(input, DEFAULT_PREFS, logged);
}

describe("validateSettings", () => {
  it("accepts the defaults", () => {
    expect(check({})).toEqual({ ok: true, prefs: DEFAULT_PREFS });
  });

  it.each([
    [{ whistlerDays: 21 }, "Whistler days must be between 0 and 20"],
    [{ whistlerDays: -1 }, "Whistler days must be between 0 and 20"],
    [{ whistlerDays: 2.5 }, "Whistler days must be between 0 and 20"],
    [{ bakerDays: 11 }, "Baker days must be between 0 and 10"],
    [{ firstSkiDay: "1999-12-31" }, "First ski day must be a date between 2000 and 2100"],
    [{ firstSkiDay: "2026-02-30" }, "First ski day must be a date between 2000 and 2100"],
    [{ lastSkiDay: "2101-01-01" }, "Last ski day must be a date between 2000 and 2100"],
    [{ lastSkiDay: "2026-11-21" }, "Last ski day must be after your first ski day"],
    [{ lastSkiDay: "2027-11-23" }, "Last ski day must be within a year of your first ski day"],
    [{ whistlerOpenDate: "2027-04-11" }, "Whistler opening date must be on or before your last ski day"],
    [{ whistlerOpenDate: "nope" }, "Whistler opening date must be a date between 2000 and 2100"],
    [{ bakerOpenDate: "2027-04-11" }, "Baker opening date must be on or before your last ski day"],
    [{ bakerOpenDate: "1999-01-01" }, "Baker opening date must be a date between 2000 and 2100"],
    [{ whistlerLowBand: "summit" }, "Whistler terrain must be base or mid-mountain"],
    [{ visibilityPref: "foggy" }, "Visibility must be one of powder, balanced or bluebird"],
    [{ dogFloor: 150 }, "Dog floor must be between 0 and 100"],
    [{ dogFloor: "" }, "Dog floor must be between 0 and 100"],
    [{ bakerTravelPenalty: 51 }, "Baker travel penalty must be between 0 and 50"],
    [{ avyPenaltyWhistler: 51 }, "Avalanche-control penalty must be between 0 and 50"],
    [{ avyPenaltyBaker: -5 }, "Avalanche-control penalty must be between 0 and 50"],
    [{ bakerTicketUsd: 501 }, "Baker ticket must be between 0 and 500"],
  ] as [SettingsInput, string][])("rejects %j", (input, error) => {
    expect(check(input)).toEqual({ ok: false, error });
  });

  it("accepts a last ski day exactly 366 days after the first", () => {
    expect(check({ lastSkiDay: "2027-11-22" }).ok).toBe(true);
  });

  it("accepts an empty Baker ticket and the bounds", () => {
    const r = check({ bakerTicketUsd: "", dogFloor: 0, whistlerDays: 20, bakerDays: 0 });
    expect(r.ok && r.prefs.bakerTicketUsd).toBe(null);
  });

  it("refuses fewer days than already logged this season", () => {
    const logged = () => ({ whistler: 3, baker: 2 });
    expect(check({ whistlerDays: 2 }, logged)).toEqual({
      ok: false,
      error: "You've already logged 3 Whistler days",
    });
    expect(check({ bakerDays: 1 }, logged)).toEqual({
      ok: false,
      error: "You've already logged 2 Baker days",
    });
  });
});

describe("saveSettings", () => {
  let db: Db;
  beforeEach(() => {
    db = openDb(":memory:");
    createAppTables(db);
  });

  it("saves nothing when a value is out of range", () => {
    saveSettings(db, "u1", { dogFloor: 50 });
    expect(saveSettings(db, "u1", { dogFloor: 150, whistlerDays: 7 })).toEqual({
      ok: false,
      error: "Dog floor must be between 0 and 100",
    });
    const { prefs } = getSettings(db, "u1");
    expect(prefs.dogFloor).toBe(50);
    expect(prefs.whistlerDays).toBe(5);
  });

  it("ignores is_demo from the form", () => {
    saveSettings(db, "u1", { isDemo: 1 } as unknown as SettingsInput);
    expect(getSettings(db, "u1").isDemo).toBe(false);
  });

  it("counts logged days within the season", () => {
    db.prepare("INSERT INTO ski_log (user_id, date, hill, created_at) VALUES (?, ?, ?, ?)").run(
      "u1", "2026-12-05", "whistler", "x",
    );
    db.prepare("INSERT INTO ski_log (user_id, date, hill, created_at) VALUES (?, ?, ?, ?)").run(
      "u1", "2026-12-06", "whistler", "x",
    );
    expect(saveSettings(db, "u1", { whistlerDays: 1 })).toEqual({
      ok: false,
      error: "You've already logged 2 Whistler days",
    });
  });
});
