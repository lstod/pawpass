import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { lastSeasonPage } from "@/server/views";
import type { IsoDate, ReplayDay } from "@/engine/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { saturdayOf } from "@/engine/time";
import { weekendLabel } from "@/components/format";
import { ReplayDayRow } from "@/components/last-season/replay-day-row";

export const metadata: Metadata = { title: "Last season · PawPass" };

export default async function LastSeasonPage() {
  const viewer = await requireViewer();
  const { days } = await lastSeasonPage(viewer);

  const weekends: { saturday: IsoDate; days: ReplayDay[] }[] = [];
  for (const day of days) {
    const saturday = saturdayOf(day.date);
    const last = weekends.at(-1);
    if (last && last.saturday === saturday) last.days.push(day);
    else weekends.push({ saturday, days: [day] });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">How it would have done last season</h1>
        <p className="text-sm text-slate-600">
          Each 2025-26 weekend as the planner called it on Friday, with what Wednesday said,
          scored on the weather that actually came.
        </p>
      </div>
      {weekends.length === 0 ? (
        <p className="text-slate-700">No weekends from last season fell in your season dates.</p>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        {weekends.map((weekend) => (
          <Card key={weekend.saturday} className="min-w-0">
            <CardHeader>
              <CardTitle>{weekendLabel(weekend.saturday)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {weekend.days.map((day) => (
                <ReplayDayRow key={day.date} day={day} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
