import { getMigrations } from "better-auth/db/migration";
import type { Auth } from "./auth";
import type { Db } from "./db";

const APP_SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY,
  whistler_days INTEGER NOT NULL DEFAULT 5,
  baker_days INTEGER NOT NULL DEFAULT 2,
  first_ski_day TEXT NOT NULL DEFAULT '2026-11-21',
  last_ski_day TEXT NOT NULL DEFAULT '2027-04-10',
  whistler_open_date TEXT NOT NULL DEFAULT '2026-11-21',
  baker_open_date TEXT NOT NULL DEFAULT '2026-12-05',
  whistler_low_band TEXT NOT NULL DEFAULT 'base' CHECK (whistler_low_band IN ('base','mid')),
  visibility_pref TEXT NOT NULL DEFAULT 'balanced' CHECK (visibility_pref IN ('powder','balanced','bluebird')),
  dog_floor INTEGER NOT NULL DEFAULT 35,
  baker_travel_penalty INTEGER NOT NULL DEFAULT 10,
  avy_penalty_whistler INTEGER NOT NULL DEFAULT 20,
  avy_penalty_baker INTEGER NOT NULL DEFAULT 10,
  baker_ticket_usd INTEGER,
  onboarded_at TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ski_log (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  hill TEXT NOT NULL CHECK (hill IN ('whistler','baker')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, date)
);
CREATE TABLE IF NOT EXISTS watch (
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  hill TEXT CHECK (hill IS NULL OR hill IN ('whistler','baker')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, date, hill)
);
CREATE TABLE IF NOT EXISTS forecast_day (
  hill TEXT NOT NULL,
  date TEXT NOT NULL,
  weather_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (hill, date)
);
CREATE TABLE IF NOT EXISTS forecast_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_ok_at TEXT,
  last_error_at TEXT,
  last_error TEXT
);
INSERT OR IGNORE INTO forecast_meta (id) VALUES (1);
`;

export function createAppTables(db: Db): void {
  db.exec(APP_SCHEMA);
}

/** Creates Better Auth's tables and the app's own; safe to run on every start. */
export async function bootstrapSchema(db: Db, auth: Auth): Promise<void> {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  createAppTables(db);
}
