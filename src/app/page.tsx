import { redirect } from "next/navigation";
import { getViewer } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  redirect(viewer.onboardedAt ? "/weekend" : "/welcome");
}
