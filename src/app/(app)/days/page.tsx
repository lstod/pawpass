import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { daysPage } from "@/server/views";
import { formatDay } from "@/engine/time";
import { HILLS } from "@/engine/hills";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SkiedBadge } from "@/components/call-badge";
import { DaysLeftCards } from "@/components/days-left-cards";
import { LogDayForm } from "@/components/days/log-day-form";
import { UndoButton } from "@/components/days/undo-button";

export const metadata: Metadata = { title: "Days · PawPass" };

export default async function DaysPage() {
  const viewer = await requireViewer();
  const data = await daysPage(viewer);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Days</h1>
      <DaysLeftCards daysLeft={data.daysLeft} allowance={data.allowance} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Log a day</CardTitle>
            <CardDescription>Any day you&apos;ve already skied this season.</CardDescription>
          </CardHeader>
          <CardContent>
            <LogDayForm today={data.today} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Logged days</CardTitle>
          </CardHeader>
          <CardContent>
            {data.entries.length === 0 ? (
              <p className="text-slate-600">No days logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-200">
                {data.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{formatDay(entry.date)}</span>
                      <SkiedBadge hill={entry.hill} />
                    </span>
                    <UndoButton
                      id={entry.id}
                      label={`${formatDay(entry.date)} at ${HILLS[entry.hill].name}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
