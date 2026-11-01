import { describe, expect, it } from "vitest";
import { buildView, decisionDate, pickLead, viewOffset, type PreviousRunsHourly } from "./fill";

describe("pickLead", () => {
  it("uses the wanted lead as is", () => {
    expect(pickLead([0, 1, 2, 3, 4], 3)).toBe(3);
    expect(pickLead([5, 1, 2, 3, 4], 0)).toBe(5);
  });

  it("takes lead 2 when lead 3 is null", () => {
    expect(pickLead([0, 1, 2, null, 4], 3)).toBe(2);
  });

  it("takes lead 0 when leads 3, 2 and 1 are null", () => {
    expect(pickLead([7, null, undefined, null, 4], 3)).toBe(7);
  });

  it("is null only when every lead down to 0 is null", () => {
    expect(pickLead([null, null, null, null, 4], 3)).toBeNull();
  });
});

describe("views", () => {
  it("finds the Wednesday and Friday before a weekend day", () => {
    expect(decisionDate("2026-01-10", "wednesday")).toBe("2026-01-07");
    expect(decisionDate("2026-01-11", "wednesday")).toBe("2026-01-07");
    expect(decisionDate("2026-01-10", "friday")).toBe("2026-01-09");
    expect(decisionDate("2026-01-11", "friday")).toBe("2026-01-09");
  });

  it("counts offsets from the decision day, clamping earlier days to 0", () => {
    const wed = viewOffset("2026-01-11", "wednesday");
    expect(["2026-01-06", "2026-01-07", "2026-01-08", "2026-01-10", "2026-01-11"].map(wed)).toEqual([0, 0, 1, 3, 4]);
    const fri = viewOffset("2026-01-11", "friday");
    expect(["2026-01-07", "2026-01-08", "2026-01-09", "2026-01-10", "2026-01-11"].map(fri)).toEqual([0, 0, 0, 1, 2]);
  });

  it("builds each hour from its lead, filling nulls from shorter leads", () => {
    const column = (lead: number) => [lead, lead, lead === 3 ? null : lead];
    const resp: PreviousRunsHourly = { time: ["2026-01-08T20:00", "2026-01-10T20:00", "2026-01-10T21:00"] };
    for (const v of ["snowfall", "rain", "temperature_2m", "wind_speed_10m", "cloud_cover"]) {
      resp[v] = column(0);
      for (let lead = 1; lead <= 4; lead++) resp[`${v}_previous_day${lead}`] = column(lead);
    }
    const view = buildView(resp, viewOffset("2026-01-10", "wednesday"));
    expect(view.time).toEqual(resp.time);
    expect(view.snowfall).toEqual([1, 3, 2]);
    expect(view.cloud_cover).toEqual([1, 3, 2]);
  });
});
