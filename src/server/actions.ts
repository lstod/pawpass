"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { todayInVancouver } from "@/engine/time";
import type { HillId, IsoDate } from "@/engine/types";
import { getAuth } from "./auth";
import { getDb } from "./db";
import { createDemoUser } from "./demo";
import * as log from "./log";
import { requireViewer } from "./session";
import * as settings from "./settings";
import * as watch from "./watch";

export type ActionResult = settings.ActionResult;

function revalidateApp() {
  for (const p of ["/weekend", "/season", "/days", "/settings", "/last-season", "/scorecard"]) revalidatePath(p);
}

export async function tryDemo(): Promise<ActionResult> {
  try {
    await createDemoUser(getDb(), getAuth(), await headers());
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't start the demo. Try again in a moment." };
  }
}

export async function saveSettings(input: settings.SettingsInput): Promise<ActionResult> {
  const viewer = await requireViewer();
  const result = settings.saveSettings(getDb(), viewer.userId, input);
  if (result.ok) revalidateApp();
  return result;
}

export async function finishOnboarding(): Promise<void> {
  const viewer = await requireViewer();
  settings.setOnboarded(getDb(), viewer.userId, new Date().toISOString());
  redirect("/weekend");
}

export async function restartWalkthrough(): Promise<void> {
  await requireViewer();
  redirect("/welcome");
}

export async function logDay(date: IsoDate, hill: HillId): Promise<ActionResult> {
  const viewer = await requireViewer();
  const result = log.logDay(getDb(), viewer.userId, viewer.prefs, todayInVancouver(new Date()), date, hill);
  if (result.ok) revalidateApp();
  return result;
}

export async function undoDay(id: number): Promise<ActionResult> {
  const viewer = await requireViewer();
  const result = log.undoDay(getDb(), viewer.userId, Number(id));
  if (result.ok) revalidateApp();
  return result;
}

export async function toggleWatch(saturday: IsoDate, hill: HillId | null): Promise<ActionResult> {
  const viewer = await requireViewer();
  const result = watch.toggleWatch(getDb(), viewer.userId, saturday, hill);
  if (result.ok) revalidateApp();
  return result;
}

export async function signOutAction(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/login");
}
