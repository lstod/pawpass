import { describe, expect, it } from "vitest";
import { outlook } from "./outlook";

describe("outlook", () => {
  it("gives median and quartiles on a known sample set", () => {
    expect(outlook([10, 20, 30, 40, 50, 60, 70, 80, 90], 60)).toEqual({
      median: 50,
      p25: 30,
      p75: 70,
      chanceAboveBar: 4 / 9,
    });
  });

  it("is order independent and interpolates", () => {
    const o = outlook([40, 10, 30, 20], 25);
    expect(o).toEqual({ median: 25, p25: 18, p75: 33, chanceAboveBar: 0.5 });
  });

  it("counts samples at or above the bar", () => {
    expect(outlook([50, 50, 49, 51], 50)?.chanceAboveBar).toBe(0.75);
  });

  it("gives 0 chance when there is no bar", () => {
    expect(outlook([80, 90], null)?.chanceAboveBar).toBe(0);
  });

  it("is null for empty samples", () => {
    expect(outlook([], 50)).toBeNull();
  });
});
