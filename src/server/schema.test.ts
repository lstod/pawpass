import { describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { openDb } from "./db";
import { bootstrapSchema } from "./schema";

function tables(db: ReturnType<typeof openDb>): string[] {
  return (
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all() as {
      name: string;
    }[]
  ).map((r) => r.name);
}

describe("bootstrapSchema", () => {
  it("creates every table on a fresh database and is idempotent", async () => {
    const db = openDb(":memory:");
    const auth = createAuth(db);
    await bootstrapSchema(db, auth);
    const first = tables(db);
    for (const t of [
      "user",
      "session",
      "account",
      "verification",
      "settings",
      "ski_log",
      "watch",
      "forecast_day",
      "forecast_meta",
    ]) {
      expect(first).toContain(t);
    }
    const schemaBefore = db.prepare("SELECT sql FROM sqlite_master ORDER BY name").all();
    await bootstrapSchema(db, auth);
    expect(db.prepare("SELECT sql FROM sqlite_master ORDER BY name").all()).toEqual(schemaBefore);
  });
});
