import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { UserPrefs } from "@/engine/types";
import { getAuth } from "./auth";
import { getDb } from "./db";
import { getSettings } from "./settings";

export interface Viewer {
  userId: string;
  name: string;
  email: string;
  isDemo: boolean;
  onboardedAt: string | null;
  prefs: UserPrefs;
}

export async function getViewer(): Promise<Viewer | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  const s = getSettings(getDb(), session.user.id);
  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
    isDemo: s.isDemo,
    onboardedAt: s.onboardedAt,
    prefs: s.prefs,
  };
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
