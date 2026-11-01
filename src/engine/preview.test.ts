import { describe, expect, it } from "vitest";
import { ACTUALS, FORECAST_FRI, FORECAST_WED } from "./data";
import { HILL_IDS } from "./hills";
import { pickPreviewSaturday, previewOptions, previewWeekend } from "./preview";
import { replay, replayPrefs } from "./replay";
import { scoreDay } from "./score";
import { DEFAULT_PREFS, DEMO_PREFS, type HillId, type UserPrefs, type WeatherByDate } from "./types";

const DATA = { actuals: ACTUALS, fri: FORECAST_FRI, wed: FORECAST_WED };

function shown(saturday: string | undefined, prefs: UserPrefs = DEMO_PREFS) {
  const p = previewWeekend(saturday, prefs, DATA);
  if ("empty" in p) throw new Error("expected a preview");
  return p;
}

describe("previewWeekend 2026-02-07 with demo settings", () => {
  const p = shown("2026-02-07");
  const [sat, sun] = p.weekend.days;

  it("is framed as that Friday", () => {
    expect(p.saturday).toBe("2026-02-07");
    expect(p.friday).toBe("2026-02-06");
    expect(p.banner).toBe("Preview: as if it were Fri Feb 6, 2026, using that Friday's forecast");
    expect(sat.daysOut).toBe(1);
    expect(sun.daysOut).toBe(2);
  });

  it("Sunday Feb 8 is a Whistler call", () => {
    expect(sun.date).toBe("2026-02-08");
    expect(sun.call).toBe("whistler");
  });

  it("uses the committed Friday view for Feb 7 and 8", () => {
    const rp = replayPrefs(DEMO_PREFS);
    for (const d of p.weekend.days) {
      expect(d.status).toBe("forecast");
      expect(d.tag).toBe("Forecast");
      for (const h of HILL_IDS) {
        expect(d.hills[h].forecast?.score).toBe(scoreDay(FORECAST_FRI[h][d.date], h, rp).score);
      }
    }
  });

  it("agrees with the replay's Friday calls, bars and days left", () => {
    const days = replay(DEMO_PREFS, ACTUALS, FORECAST_FRI, FORECAST_WED);
    const before = days.filter((d) => d.date < "2026-02-07");
    expect(p.daysLeft).toEqual({
      whistler: DEMO_PREFS.whistlerDays - before.filter((d) => d.friday.call === "whistler").length,
      baker: DEMO_PREFS.bakerDays - before.filter((d) => d.friday.call === "baker").length,
    });
    for (const d of p.weekend.days) {
      const r = days.find((x) => x.date === d.date);
      expect(d.call).toBe(r?.friday.call);
      expect({ whistler: d.hills.whistler.bar, baker: d.hills.baker.bar }).toEqual(r?.friday.bars);
    }
  });

  it("is read-only", () => {
    for (const d of p.weekend.days) {
      expect(d.loggable).toEqual({ ok: false, reason: "Preview only" });
      expect(d.logged).toBeNull();
    }
  });

  it("plans on the replay's training seasons, with 2025-26 held out", () => {
    const changed: Record<HillId, WeatherByDate> = { whistler: { ...ACTUALS.whistler }, baker: { ...ACTUALS.baker } };
    for (const h of HILL_IDS) {
      for (const date of Object.keys(changed[h])) {
        if (date >= "2025-08-01") changed[h][date] = { ...changed[h][date], snow72: 60, snow24: 0, cloudMean: 5 };
      }
    }
    const again = previewWeekend("2026-02-07", DEMO_PREFS, { ...DATA, actuals: changed });
    expect(JSON.stringify(again)).toBe(JSON.stringify(p));
  });
});

describe("preview opening dates", () => {
  it("uses replayOpenDate, not the user's open dates", () => {
    const p = shown("2025-12-13");
    for (const d of p.weekend.days) {
      expect(d.hills.baker.open).toBe(false);
      expect(d.hills.baker.bar).toBeNull();
      expect(d.call).not.toBe("baker");
      expect(d.hills.whistler.open).toBe(true);
    }
  });
});

describe("preview selection", () => {
  const options = previewOptions(DEMO_PREFS);

  it("offers the Saturdays in the replay window", () => {
    expect(options[0]).toBe("2025-11-22");
    expect(options.at(-1)).toBe("2026-04-04");
    expect(options).toContain("2026-02-07");
  });

  it("falls back to Feb 7 for missing, malformed, non-Saturday or out-of-window values", () => {
    for (const bad of [undefined, "", "garbage", "2026-02-30", "2026-02-08", "2025-10-04", "2026-05-02"]) {
      expect(pickPreviewSaturday(bad, options)).toBe("2026-02-07");
      expect(shown(bad).saturday).toBe("2026-02-07");
    }
    expect(shown("2026-03-14").saturday).toBe("2026-03-14");
  });

  it("falls back to the first Saturday when Feb 7 is outside the window", () => {
    const prefs = { ...DEFAULT_PREFS, firstSkiDay: "2027-03-01", lastSkiDay: "2027-04-10" };
    expect(shown(undefined, prefs).saturday).toBe("2026-03-07");
    expect(shown("2026-02-07", prefs).saturday).toBe("2026-03-07");
  });

  it("is empty when no weekend falls in the window", () => {
    const prefs = { ...DEFAULT_PREFS, firstSkiDay: "2027-06-01", lastSkiDay: "2027-09-01" };
    expect(previewWeekend(undefined, prefs, DATA)).toEqual({ empty: true });
  });
});
