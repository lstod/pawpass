import { createHealthHandler, sqliteVersion } from "@/server/health";

export const dynamic = "force-dynamic";

export const GET = createHealthHandler(sqliteVersion);
