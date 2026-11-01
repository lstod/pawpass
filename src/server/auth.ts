import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { getDb, type Db } from "./db";

export const DEMO_LOCKED_MESSAGE = "The demo account can't be changed";

/** The only Better Auth paths a demo session may call; everything else is refused. */
const DEMO_ALLOWED_PATHS = new Set(["/get-session", "/sign-out", "/ok"]);

export function isDemoUser(db: Db, userId: string): boolean {
  const row = db.prepare("SELECT is_demo FROM settings WHERE user_id = ?").get(userId) as
    | { is_demo: number }
    | undefined;
  return row?.is_demo === 1;
}

export function demoPathAllowed(path: string): boolean {
  return DEMO_ALLOWED_PATHS.has(path) || path.startsWith("/sign-in/");
}

export function createAuth(db: Db) {
  return betterAuth({
    database: db,
    emailAndPassword: { enabled: true },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (demoPathAllowed(ctx.path)) return;
        const session = await getSessionFromCtx(ctx);
        if (session && isDemoUser(db, session.user.id)) {
          throw new APIError("FORBIDDEN", { message: DEMO_LOCKED_MESSAGE });
        }
      }),
    },
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const AUTH_KEY = Symbol.for("pawpass.auth");
type GlobalWithAuth = typeof globalThis & { [AUTH_KEY]?: Auth };

export function getAuth(): Auth {
  const g = globalThis as GlobalWithAuth;
  if (!g[AUTH_KEY]) g[AUTH_KEY] = createAuth(getDb());
  return g[AUTH_KEY];
}
