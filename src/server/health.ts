export async function sqliteVersion(): Promise<string> {
  // Loaded here rather than at the top so a missing native module is reported as unhealthy.
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(":memory:");
  try {
    const row = db.prepare("select sqlite_version() as v").get() as { v: string };
    return row.v;
  } finally {
    db.close();
  }
}

export function createHealthHandler(probe: () => Promise<string>) {
  return async function GET(): Promise<Response> {
    const headers = { "Cache-Control": "no-store" };
    try {
      const sqlite = await probe();
      return Response.json({ ok: true, sqlite }, { headers });
    } catch (error) {
      console.error("health check failed", error);
      return Response.json({ ok: false }, { status: 500, headers });
    }
  };
}
