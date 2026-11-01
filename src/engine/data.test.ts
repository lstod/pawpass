import { describe, expect, it } from "vitest";
import { ACTUALS, FORECAST_FRI, FORECAST_WED } from "./data";
import { HILL_IDS, REPLAY_END, REPLAY_START } from "./hills";
import { weekendDays } from "./time";

describe("committed data", () => {
  it("has actuals at both hills for Nov 1 and Apr 30 of every season", () => {
    for (const h of HILL_IDS) {
      for (let y = 2017; y <= 2025; y++) {
        expect(ACTUALS[h][`${y}-11-01`]).toBeDefined();
        expect(ACTUALS[h][`${y + 1}-04-30`]).toBeDefined();
      }
    }
  });

  it("has both forecast views for every 2025-26 weekend day", () => {
    for (const day of weekendDays(REPLAY_START, REPLAY_END)) {
      for (const h of HILL_IDS) {
        expect(FORECAST_FRI[h][day], `${h} friday ${day}`).toBeDefined();
        expect(FORECAST_WED[h][day], `${h} wednesday ${day}`).toBeDefined();
        expect(typeof FORECAST_FRI[h][day].snow72).toBe("number");
      }
    }
  });
});
