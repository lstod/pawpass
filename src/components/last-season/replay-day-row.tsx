import { ArrowLeftRight, TriangleAlert } from "lucide-react";
import { HILL_IDS, HILLS } from "@/engine/hills";
import { PAST_COPY, callLabel } from "@/engine/labels";
import { formatDay } from "@/engine/time";
import type { HillId, ReplayDay } from "@/engine/types";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CALL_STYLE, CallBadge } from "@/components/call-badge";
import { ReasonChips } from "@/components/reason-chips";

function HillPast({ day, hill }: { day: ReplayDay; hill: HillId }) {
  const style = CALL_STYLE[hill];
  const Icon = style.icon;
  const forecast = day.friday.scores[hill];
  const bar = day.friday.bars[hill];
  return (
    <div className="min-w-0 space-y-1.5 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className={cn("size-4 shrink-0", style.iconClass)} aria-hidden />
        {HILLS[hill].name}
      </p>
      {!day.open[hill] ? (
        <p className="text-sm text-slate-600">Was closed</p>
      ) : (
        <>
          <p className="text-sm tabular-nums">
            {forecast ? `Forecast ${forecast.score}` : "No forecast"} · Actual{" "}
            {day.actual[hill].score}
          </p>
          {bar !== null ? <p className="text-sm text-slate-700">{PAST_COPY.wasWorth(bar)}</p> : null}
          <ReasonChips parts={day.actual[hill].parts} />
        </>
      )}
    </div>
  );
}

export function ReplayDayRow({ day }: { day: ReplayDay }) {
  const wednesday = callLabel(day.wednesday.call, "past");
  return (
    <section
      aria-label={formatDay(day.date)}
      className={cn(
        "min-w-0 space-y-3 rounded-lg p-3 ring-1",
        day.changed ? "bg-rose-50/40 ring-rose-200" : "ring-slate-200",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{formatDay(day.date)}</h3>
        {day.changed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-900 ring-1 ring-rose-200">
            <ArrowLeftRight className="size-3.5 shrink-0" aria-hidden />
            {PAST_COPY.callChanged}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
          {PAST_COPY.fridayCall}
        </p>
        <CallBadge call={day.friday.call} tense="past" />
      </div>
      <p className={cn("text-sm break-words", day.changed ? "text-rose-900" : "text-slate-700")}>
        {PAST_COPY.wednesdaySaid}: <span className="font-medium">{wednesday.label}</span>
      </p>
      <p className="text-sm text-slate-700">
        {PAST_COPY.hadLeft(day.leftBefore.whistler, day.leftBefore.baker)}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {HILL_IDS.map((hill) => (
          <HillPast key={hill} day={day} hill={hill} />
        ))}
      </div>
      {day.miss ? (
        <Alert className="border-slate-200 bg-slate-50 text-slate-800">
          <TriangleAlert aria-hidden />
          <AlertDescription className="break-words text-slate-700">
            {PAST_COPY.missText(day.miss.forecast, day.miss.actual, day.miss.reason)}
          </AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}
