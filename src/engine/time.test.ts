import { describe, expect, it } from "vitest";
import {
  addDays,
  currentWeekend,
  dayOfWeek,
  daysBetween,
  formatDay,
  formatDayWithYear,
  loggable,
  mapToReplaySeason,
  saturdayOf,
  timeInVancouver,
  todayInVancouver,
  weekendDays,
} from "./time";
import { DEFAULT_PREFS } from "./types";

describe("date arithmetic", () => {
  it("adds days across months, years and DST changes", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-08", -1)).toBe("2026-03-07");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("counts days b - a", () => {
    expect(daysBetween("2026-11-01", "2026-11-21")).toBe(20);
    expect(daysBetween("2026-11-21", "2026-11-01")).toBe(-20);
    expect(daysBetween("2026-03-01", "2026-03-15")).toBe(14);
  });

  it("gives the weekday, 0 = Sunday", () => {
    expect(dayOfWeek("2026-11-01")).toBe(0);
    expect(dayOfWeek("2026-10-31")).toBe(6);
    expect(dayOfWeek("2026-11-02")).toBe(1);
  });

  it("formats days", () => {
    expect(formatDay("2026-11-21")).toBe("Sat Nov 21");
    expect(formatDayWithYear("2026-02-06")).toBe("Fri Feb 6, 2026");
  });

  it("lists every weekend day in a range", () => {
    expect(weekendDays("2026-11-20", "2026-11-29")).toEqual([
      "2026-11-21",
      "2026-11-22",
      "2026-11-28",
      "2026-11-29",
    ]);
    expect(weekendDays("2026-11-23", "2026-11-27")).toEqual([]);
  });

  it("maps a date onto the 2025-26 season", () => {
    expect(mapToReplaySeason("2026-11-21")).toBe("2025-11-21");
    expect(mapToReplaySeason("2026-12-05")).toBe("2025-12-05");
    expect(mapToReplaySeason("2027-04-10")).toBe("2026-04-10");
    expect(mapToReplaySeason("2026-10-15")).toBe("2025-10-15");
    expect(mapToReplaySeason("2028-02-29")).toBe("2026-02-28");
  });

  it("finds the weekend's Saturday", () => {
    expect(saturdayOf("2026-11-01")).toBe("2026-10-31");
    expect(saturdayOf("2026-10-31")).toBe("2026-10-31");
    expect(saturdayOf("2026-11-04")).toBe("2026-11-07");
  });
});

describe("Vancouver time", () => {
  it("Sunday 2026-11-01 18:00 PT selects the Oct 31-Nov 1 weekend, not Nov 7-8", () => {
    const today = todayInVancouver(new Date("2026-11-02T01:00:00Z"));
    expect(today).toBe("2026-11-01");
    const weekend = currentWeekend(today);
    expect(weekend.saturday).toBe("2026-10-31");
    expect(weekend.days).toEqual(["2026-10-31", "2026-11-01"]);
  });

  it("Saturday selects today and tomorrow", () => {
    const today = todayInVancouver(new Date("2026-11-07T20:00:00Z"));
    expect(today).toBe("2026-11-07");
    expect(currentWeekend(today).days).toEqual(["2026-11-07", "2026-11-08"]);
  });

  it("Monday to Friday select the coming Saturday and Sunday", () => {
    for (const day of ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]) {
      expect(currentWeekend(day).days).toEqual(["2026-11-07", "2026-11-08"]);
    }
  });

  it("uses the Vancouver date late in the evening", () => {
    expect(todayInVancouver(new Date("2026-07-02T06:30:00Z"))).toBe("2026-07-01");
  });

  it("formats a time in Vancouver, 24h", () => {
    expect(timeInVancouver("2026-07-01T19:05:00Z")).toBe("12:05");
    expect(timeInVancouver("2026-07-02T06:30:00Z")).toBe("23:30");
  });
});

describe("loggable", () => {
  const prefs = DEFAULT_PREFS;
  const left = { whistler: 5, baker: 2 };

  it("explains pre-season", () => {
    expect(loggable("2026-11-01", "whistler", "2026-11-01", prefs, left)).toEqual({
      ok: false,
      reason: "You can log days from Sat Nov 21, your first ski day, once they've happened.",
    });
  });

  it("explains a future day", () => {
    expect(loggable("2026-12-12", "whistler", "2026-12-08", prefs, left)).toEqual({
      ok: false,
      reason: "You can log days that have happened. Come back on Sat Dec 12.",
    });
  });

  it("explains a day after the last ski day", () => {
    expect(loggable("2027-04-17", "whistler", "2027-04-20", prefs, left)).toEqual({
      ok: false,
      reason: "Sat Apr 17 is after your last ski day.",
    });
  });

  it("explains a hill that isn't open yet", () => {
    expect(loggable("2026-11-28", "baker", "2026-11-30", prefs, left)).toEqual({
      ok: false,
      reason: "Baker isn't open until Sat Dec 5.",
    });
  });

  it("explains no days left", () => {
    expect(loggable("2026-12-12", "baker", "2026-12-12", prefs, { whistler: 5, baker: 0 })).toEqual({
      ok: false,
      reason: "No Baker days left.",
    });
  });

  it("allows today and past in-season days with the hill open", () => {
    expect(loggable("2026-12-12", "whistler", "2026-12-12", prefs, left)).toEqual({ ok: true });
    expect(loggable("2026-11-25", "whistler", "2026-12-12", prefs, left)).toEqual({ ok: true });
  });

  it("allows an injected in-season today", () => {
    const early = { ...prefs, firstSkiDay: "2026-10-15", whistlerOpenDate: "2026-10-15" };
    expect(loggable("2026-11-01", "whistler", "2026-11-01", early, left)).toEqual({ ok: true });
  });
});
