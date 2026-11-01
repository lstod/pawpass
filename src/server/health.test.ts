import { describe, expect, it, vi } from "vitest";
import { createHealthHandler, sqliteVersion } from "./health";

describe("sqliteVersion", () => {
  it("opens an in-memory database and returns the SQLite version", async () => {
    expect(await sqliteVersion()).toMatch(/^3\.\d+\.\d+$/);
  });
});

describe("createHealthHandler", () => {
  it("returns ok with the SQLite version and no caching", async () => {
    const res = await createHealthHandler(() => Promise.resolve("3.0.0"))();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
    expect(await res.json()).toEqual({ ok: true, sqlite: "3.0.0" });
  });

  it("returns 500 without error details when the probe fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await createHealthHandler(() =>
      Promise.reject(new Error("could not load native module")),
    )();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false });
    spy.mockRestore();
  });
});
