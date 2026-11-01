import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { requireViewer } from "@/server/session";
import { settingsPage } from "@/server/views";
import { restartWalkthrough } from "@/server/actions";
import { Button } from "@/components/ui/button";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings · PawPass" };

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const data = await settingsPage(viewer);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {data.isDemo ? (
          <p className="text-sm text-slate-600">
            These are your demo skier&apos;s settings. Change anything; they&apos;re yours.
          </p>
        ) : null}
      </div>
      <SettingsForm prefs={data.prefs} logged={data.logged} />
      <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4">
        <form action={restartWalkthrough}>
          <Button type="submit" variant="outline">
            <Compass aria-hidden />
            Show me around
          </Button>
        </form>
        <Link href="/privacy" className="text-sm text-slate-600 underline-offset-4 hover:underline">
          Privacy
        </Link>
      </div>
    </div>
  );
}
