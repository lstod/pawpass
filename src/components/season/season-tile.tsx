"use client";

import { HILL_IDS, HILLS } from "@/engine/hills";
import { EITHER_WAY, LIKELY_LABELS, callLabel } from "@/engine/labels";
import { formatDay } from "@/engine/time";
import type { Call, DayView, HillId, WeekendView } from "@/engine/types";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CALL_STYLE, CallBadge, CompactCallBadge, SkiedBadge } from "@/components/call-badge";
import { roundTenth, weekendLabel } from "@/components/format";
import { HillDetail, pct } from "@/components/hill-detail";
import { StarredMark, TagBadge, WorthWatching } from "@/components/markers";
import { StarToggle } from "@/components/star-toggle";
import { LogButtons, chancesText } from "@/components/weekend/day-row";

function LikelyLabel({ call }: { call: Call | null }) {
  if (!call) return <span className="block text-xs text-slate-600">{EITHER_WAY}</span>;
  const style = CALL_STYLE[call];
  const Icon = style.icon;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium", style.iconClass)}
      title={callLabel(call, "live").label}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {LIKELY_LABELS[call]}
    </span>
  );
}

function TileHalf({ day }: { day: DayView }) {
  let body: React.ReactNode;
  if (day.status === "logged" && day.logged) body = <SkiedBadge hill={day.logged} />;
  else if (day.status === "past") body = <span className="text-xs text-slate-600">Past</span>;
  else if (day.status === "preseason") body = <CompactCallBadge call="dog" tense="live" tooltip={false} />;
  else if (day.status === "outlook" && day.chances)
    body = (
      <>
        <span className="block text-xs text-slate-700">{chancesText(day)}</span>
        <LikelyLabel call={day.likely} />
      </>
    );
  else if (day.call) body = <CompactCallBadge call={day.call} tense="live" tooltip={false} />;
  else body = <span className="text-xs text-slate-600">No forecast yet</span>;
  return (
    <span className="block min-w-0 space-y-1 rounded-lg bg-slate-50 p-2">
      <span className="block text-xs font-medium text-slate-500">{formatDay(day.date)}</span>
      {body}
    </span>
  );
}

function DayDetail({
  day,
  today,
  bakerTravelPenalty,
}: {
  day: DayView;
  today: string;
  bakerTravelPenalty: number;
}) {
  const showHills = day.status === "forecast" || day.status === "outlook";
  return (
    <section className="min-w-0 space-y-3" aria-label={formatDay(day.date)}>
      <h3 className="flex flex-wrap items-center gap-2 font-medium">
        {formatDay(day.date)}
        {day.date === today ? (
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">Today</span>
        ) : null}
        <TagBadge tag={day.tag} />
      </h3>
      {day.status === "logged" && day.logged ? <SkiedBadge hill={day.logged} /> : null}
      {day.status === "past" ? <p className="text-slate-600">Past</p> : null}
      {day.status === "preseason" ? <CallBadge call="dog" tense="live" /> : null}
      {showHills && day.call ? <CallBadge call={day.call} tense="live" /> : null}
      {day.note ? <p className="break-words text-slate-700">{day.note}</p> : null}
      {day.chances ? (
        <div className="space-y-0.5 text-slate-700">
          <p>
            Chance of each call: Whistler {pct(day.chances.whistler)}, Baker{" "}
            {pct(day.chances.baker)}, dog {pct(day.chances.dog)}
          </p>
          <LikelyLabel call={day.likely} />
        </div>
      ) : null}
      {day.expectedLeftAfter ? (
        <p className="text-slate-700">
          Expected days left after: {roundTenth(day.expectedLeftAfter.whistler)} Whistler,{" "}
          {roundTenth(day.expectedLeftAfter.baker)} Baker
        </p>
      ) : null}
      {showHills ? (
        <div className="space-y-2">
          {HILL_IDS.map((hill) => (
            <HillDetail
              key={hill}
              hill={hill}
              view={day.hills[hill]}
              bakerTravelPenalty={bakerTravelPenalty}
            />
          ))}
        </div>
      ) : null}
      <LogButtons day={day} single="I skied" />
      {!day.loggable.ok && day.status !== "logged" ? (
        <p className="text-sm break-words text-slate-600">{day.loggable.reason}</p>
      ) : null}
    </section>
  );
}

export function SeasonTile({
  weekend,
  today,
  bakerTravelPenalty,
}: {
  weekend: WeekendView & { starred: (HillId | null)[] };
  today: string;
  bakerTravelPenalty: number;
}) {
  const label = weekendLabel(weekend.saturday);
  const wholeStarred = weekend.starred.includes(null);
  return (
    <Dialog>
      <div className="relative min-w-0 rounded-xl bg-white ring-1 ring-slate-200 transition-shadow hover:shadow-sm">
        <DialogTrigger className="block w-full rounded-xl p-3 pr-12 text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          <span className="block font-medium">{label}</span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {weekend.days[0] ? <TagBadge tag={weekend.days[0].tag} /> : null}
            {weekend.worthWatching ? <WorthWatching /> : null}
            <StarredMark starred={weekend.starred} />
          </span>
          <span className="mt-2 grid grid-cols-2 gap-2">
            {weekend.days.map((day) => (
              <TileHalf key={day.date} day={day} />
            ))}
          </span>
          <span className="sr-only">Show details</span>
        </DialogTrigger>
        <div className="absolute top-2 right-2">
          <StarToggle
            saturday={weekend.saturday}
            hill={null}
            starred={wholeStarred}
            label={`Star the weekend of ${label}`}
          />
        </div>
      </div>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5">
            {weekend.worthWatching ? <WorthWatching /> : <span>Weekend details</span>}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <StarToggle
            saturday={weekend.saturday}
            hill={null}
            starred={wholeStarred}
            label="Star this weekend"
            showText
          />
          {HILL_IDS.map((hill) => (
            <StarToggle
              key={hill}
              saturday={weekend.saturday}
              hill={hill}
              starred={weekend.starred.includes(hill)}
              label={`Star ${HILLS[hill].name}`}
              showText
            />
          ))}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {weekend.days.map((day) => (
            <DayDetail
              key={day.date}
              day={day}
              today={today}
              bakerTravelPenalty={bakerTravelPenalty}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
