import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export type Db = Database.Database;

const DB_KEY = Symbol.for("pawpass.db");
type GlobalWithDb = typeof globalThis & { [DB_KEY]?: Db };

export function openDb(file: string): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function getDb(): Db {
  const g = globalThis as GlobalWithDb;
  if (!g[DB_KEY]) {
    const file =
      process.env.DATABASE_PATH ??
      path.join(process.cwd(), /*turbopackIgnore: true*/ "db", "pawpass.db");
    g[DB_KEY] = openDb(file);
  }
  return g[DB_KEY];
}
