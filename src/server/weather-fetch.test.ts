import { describe, expect, it, vi } from "vitest";
import { fetchJson, fetchLiveForecast, type FetchFn } from "./weather-fetch";

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const notOk = (status: number) => ({ ok: false, status, json: async () => ({}) });

describe("fetchJson", () => {
  it("retries a failed request once and returns the second result", async () => {
    const fetchFn = vi
      .fn<FetchFn>()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce(ok({ hello: 1 }));
    await expect(fetchJson("https://example.test/a", fetchFn)).resolves.toEqual({ hello: 1 });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("throws naming the URL after two failures", async () => {
    const fetchFn = vi.fn<FetchFn>().mockResolvedValue(notOk(503));
    await expect(fetchJson("https://example.test/b", fetchFn)).rejects.toThrow(/https:\/\/example\.test\/b/);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

/** Hourly UTC series, Jan 5 to Jan 15 2026; Vancouver is UTC-8. */
function hourly(nullAt: string | null) {
  const time: string[] = [];
  for (let t = Date.parse("2026-01-05T00:00:00Z"); t <= Date.parse("2026-01-15T23:00:00Z"); t += 3_600_000) {
    time.push(new Date(t).toISOString().slice(0, 16));
  }
  const fill = (v: number) => time.map(() => v);
  return {
    time,
    snowfall: fill(0.5),
    rain: fill(0),
    temperature_2m: fill(-2),
    wind_speed_10m: fill(15),
    cloud_cover: time.map((t) => (t === nullAt ? null : 80)),
  };
}

describe("fetchLiveForecast", () => {
  it("drops a day whose 09:00-16:00 window has a null hour", async () => {
    const urls: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      urls.push(url);
      const params = new URL(url).searchParams;
      const whistlerSummit = params.get("elevation") === "2182";
      return ok({ hourly: hourly(whistlerSummit ? "2026-01-12T20:00" : null) });
    };
    const out = await fetchLiveForecast(fetchFn);

    expect(urls).toHaveLength(5);
    for (const url of urls) {
      const params = new URL(url).searchParams;
      expect(params.get("models")).toBe("ecmwf_ifs");
      expect(params.get("timezone")).toBe("UTC");
      expect(params.get("past_days")).toBe("3");
      expect(params.get("forecast_days")).toBe("16");
    }

    const full = ["2026-01-08", "2026-01-09", "2026-01-10", "2026-01-11", "2026-01-12", "2026-01-13", "2026-01-14", "2026-01-15"];
    expect(Object.keys(out.baker)).toEqual(full);
    expect(Object.keys(out.whistler)).toEqual(full.filter((d) => d !== "2026-01-12"));
    expect(out.whistler["2026-01-10"]).toEqual({
      snow24: 12,
      snow72: 36,
      low: { base: { rain: 0, tempMax: -2 }, mid: { rain: 0, tempMax: -2 } },
      windSummitMax: 15,
      windSummitOvernightMax: 15,
      cloudMean: 80,
      snowSkiHours: 3.5,
    });
  });
});
