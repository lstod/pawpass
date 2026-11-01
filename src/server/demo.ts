import { randomBytes, randomInt } from "node:crypto";
import { DEMO_PREFS } from "@/engine/types";
import type { Auth } from "./auth";
import type { Db } from "./db";
import { writePrefs } from "./settings";

const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function demoEmail(): string {
  let id = "";
  for (let i = 0; i < 10; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return `demo-${id}@demo.pawpass.app`;
}

/** Creates a throwaway skier with Liam's settings and signs the visitor in (via the auth cookie plugin). */
export async function createDemoUser(db: Db, auth: Auth, headers?: Headers): Promise<string> {
  const res = await auth.api.signUpEmail({
    body: { email: demoEmail(), password: randomBytes(32).toString("base64url"), name: "Demo skier" },
    headers,
  });
  writePrefs(db, res.user.id, DEMO_PREFS, true);
  return res.user.id;
}

function createdAtMs(value: unknown): number {
  if (typeof value === "number") return value;
  return new Date(String(value)).getTime();
}

/** Deletes demo users created more than a day ago, with everything they own, in one transaction. */
export function pruneDemoUsers(db: Db, now: Date): number {
  const rows = db
    .prepare('SELECT u.id, u."createdAt" AS created FROM user u JOIN settings s ON s.user_id = u.id WHERE s.is_demo = 1')
    .all() as { id: string; created: unknown }[];
  const cutoff = now.getTime() - DEMO_TTL_MS;
  const stale = rows.filter((r) => createdAtMs(r.created) < cutoff).map((r) => r.id);
  if (stale.length === 0) return 0;
  const del = db.transaction((ids: string[]) => {
    for (const id of ids) {
      db.prepare("DELETE FROM watch WHERE user_id = ?").run(id);
      db.prepare("DELETE FROM ski_log WHERE user_id = ?").run(id);
      db.prepare('DELETE FROM session WHERE "userId" = ?').run(id);
      db.prepare('DELETE FROM account WHERE "userId" = ?').run(id);
      db.prepare("DELETE FROM settings WHERE user_id = ?").run(id);
      db.prepare("DELETE FROM user WHERE id = ?").run(id);
    }
  });
  del(stale);
  return stale.length;
}
