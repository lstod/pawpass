import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_PREFS } from "@/engine/types";
import { createAuth, demoPathAllowed, type Auth } from "./auth";
import { openDb, type Db } from "./db";
import { createDemoUser, pruneDemoUsers } from "./demo";
import { bootstrapSchema } from "./schema";
import { getSettings } from "./settings";

let db: Db;
let auth: Auth;

beforeEach(async () => {
  db = openDb(":memory:");
  auth = createAuth(db);
  await bootstrapSchema(db, auth);
});

function count(table: string, where = "1 = 1", ...args: unknown[]): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get(...args) as { n: number }).n;
}

describe("createDemoUser", () => {
  it("creates a demo skier with Liam's settings and an empty log", async () => {
    const id = await createDemoUser(db, auth);
    const user = db.prepare("SELECT email, name FROM user WHERE id = ?").get(id) as {
      email: string;
      name: string;
    };
    expect(user.email).toMatch(/^demo-[a-z0-9]{10}@demo\.pawpass\.app$/);
    expect(user.name).toBe("Demo skier");
    const s = getSettings(db, id);
    expect(s.isDemo).toBe(true);
    expect(s.onboardedAt).toBeNull();
    expect(s.prefs).toEqual(DEMO_PREFS);
    expect(s.prefs).toMatchObject({
      whistlerDays: 5,
      bakerDays: 2,
      whistlerLowBand: "mid",
      visibilityPref: "balanced",
      bakerTravelPenalty: 0,
      avyPenaltyWhistler: 20,
      avyPenaltyBaker: 10,
      lastSkiDay: "2027-04-10",
    });
    expect(count("ski_log", "user_id = ?", id)).toBe(0);
    expect(count("watch", "user_id = ?", id)).toBe(0);
    expect(count("session", '"userId" = ?', id)).toBe(1);
  });

  it("gives every visitor their own account", async () => {
    const a = await createDemoUser(db, auth);
    const b = await createDemoUser(db, auth);
    expect(a).not.toBe(b);
  });
});

describe("pruneDemoUsers", () => {
  it("deletes demo users older than a day with all their rows, and keeps others", async () => {
    const old = await createDemoUser(db, auth);
    const fresh = await createDemoUser(db, auth);
    const real = (
      await auth.api.signUpEmail({ body: { email: "skier@example.com", password: "a-long-password", name: "S" } })
    ).user.id;
    db.prepare("INSERT INTO ski_log (user_id, date, hill, created_at) VALUES (?, '2026-12-05', 'whistler', 'x')").run(old);
    db.prepare("INSERT INTO watch (user_id, date, hill, created_at) VALUES (?, '2026-12-05', NULL, 'x')").run(old);
    const longAgo = new Date(Date.now() - 25 * 3600_000);
    const created = db.prepare('SELECT "createdAt" AS c FROM user WHERE id = ?').get(fresh) as { c: unknown };
    const stamp = typeof created.c === "number" ? longAgo.getTime() : longAgo.toISOString();
    db.prepare('UPDATE user SET "createdAt" = ? WHERE id = ?').run(stamp, old);
    db.prepare('UPDATE user SET "createdAt" = ? WHERE id = ?').run(stamp, real);

    expect(pruneDemoUsers(db, new Date())).toBe(1);
    for (const [table, col] of [
      ["user", "id"],
      ["session", '"userId"'],
      ["account", '"userId"'],
      ["settings", "user_id"],
      ["ski_log", "user_id"],
      ["watch", "user_id"],
    ]) {
      expect(count(table, `${col} = ?`, old)).toBe(0);
    }
    expect(count("user", "id = ?", fresh)).toBe(1);
    expect(count("user", "id = ?", real)).toBe(1);
  });
});

describe("demo lockdown allowlist", () => {
  it("allows only reading the session, signing in and signing out", () => {
    for (const p of ["/get-session", "/sign-out", "/sign-in/email", "/ok"]) expect(demoPathAllowed(p)).toBe(true);
    for (const p of [
      "/change-password",
      "/change-email",
      "/update-user",
      "/list-sessions",
      "/revoke-session",
      "/revoke-sessions",
      "/revoke-other-sessions",
      "/set-password",
      "/delete-user",
    ]) {
      expect(demoPathAllowed(p)).toBe(false);
    }
  });
});
