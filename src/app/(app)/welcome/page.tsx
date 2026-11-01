import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { Walkthrough } from "@/components/welcome/walkthrough";

export const metadata: Metadata = { title: "Welcome · PawPass" };

export default async function WelcomePage() {
  const viewer = await requireViewer();
  return <Walkthrough prefs={viewer.prefs} />;
}
