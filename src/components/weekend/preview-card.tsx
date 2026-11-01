import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import type { DaysLeft, IsoDate, WeekendView } from "@/engine/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DaysLeftCards } from "@/components/days-left-cards";
import { WorthWatching } from "@/components/markers";
import { DayRow } from "@/components/weekend/day-row";
import { PreviewSelect } from "@/components/weekend/preview-select";

export type PreviewData =
  | {
      saturday: IsoDate;
      friday: IsoDate;
      options: IsoDate[];
      banner: string;
      daysLeft: DaysLeft;
      weekend: WeekendView;
    }
  | { empty: true };

export function PreviewCard({
  preview,
  allowance,
  bakerTravelPenalty,
}: {
  preview: PreviewData;
  allowance: DaysLeft;
  bakerTravelPenalty: number;
}) {
  return (
    <Card className="min-w-0 bg-white ring-2 ring-violet-200">
      <CardHeader>
        <CardTitle className="text-lg">Preview: a weekend from last season</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {"empty" in preview ? (
          <p className="text-slate-700">No weekend from last season falls in your season dates</p>
        ) : (
          <>
            <Alert className="border-violet-200 bg-violet-50 text-violet-950">
              <Info aria-hidden />
              <AlertDescription className="break-words text-violet-950">
                {preview.banner}
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <PreviewSelect value={preview.saturday} options={preview.options} />
              {preview.weekend.worthWatching ? <WorthWatching /> : null}
            </div>
            <DaysLeftCards daysLeft={preview.daysLeft} allowance={allowance} />
            <div className="grid gap-3 lg:grid-cols-2">
              {preview.weekend.days.map((day) => (
                <DayRow
                  key={day.date}
                  day={day}
                  bakerTravelPenalty={bakerTravelPenalty}
                  interactive={false}
                />
              ))}
            </div>
          </>
        )}
        <Link
          href="/last-season"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          See the whole season on last season&apos;s replay
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
