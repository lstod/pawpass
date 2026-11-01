import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { requireViewer } from "@/server/session";
import { weekendPage } from "@/server/views";
import { DEFAULT_PREVIEW_SATURDAY } from "@/engine/hills";
import { DaysLeftCards } from "@/components/days-left-cards";
import { StarredMark, WorthWatching } from "@/components/markers";
import { DayRow } from "@/components/weekend/day-row";
import { PreviewCard } from "@/components/weekend/preview-card";
import { weekendLabel } from "@/components/format";

export const metadata: Metadata = { title: "This weekend · PawPass" };

export default async function WeekendPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const viewer = await requireViewer();
  if (!viewer.onboardedAt) redirect("/welcome");
  const { preview: raw } = await searchParams;
  const data = await weekendPage(viewer, typeof raw === "string" ? raw : undefined);
  const penalty = viewer.prefs.bakerTravelPenalty;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">This weekend</h1>
          <p className="text-sm text-slate-600">{weekendLabel(data.current.saturday)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          {data.current.worthWatching ? <WorthWatching /> : null}
          <StarredMark starred={data.starred} />
          <span>{data.forecastAsOf ? `forecast as of ${data.forecastAsOf}` : "No forecast yet"}</span>
        </div>
      </div>

      <DaysLeftCards
        daysLeft={data.daysLeft}
        allowance={data.allowance}
        dogDays={data.dogDaysSoFar}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        {data.current.days.map((day) => (
          <DayRow
            key={day.date}
            day={day}
            today={data.today}
            bakerTravelPenalty={penalty}
            starred={data.starred}
            interactive
          />
        ))}
      </div>

      {data.preview ? (
        <PreviewCard preview={data.preview} allowance={data.allowance} bakerTravelPenalty={penalty} />
      ) : (
        <Link
          href={`/weekend?preview=${DEFAULT_PREVIEW_SATURDAY}`}
          className="inline-flex items-center gap-1 text-sm text-slate-700 underline-offset-4 hover:underline"
        >
          <History className="size-4" aria-hidden />
          Preview last season
        </Link>
      )}
    </div>
  );
}
