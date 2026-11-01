import { HILL_IDS } from "@/engine/hills";
import { formatDay } from "@/engine/time";
import type { DayView, HillId, IsoDate } from "@/engine/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallBadge, SkiedBadge, hillShort } from "@/components/call-badge";
import { HillDetail, pct } from "@/components/hill-detail";
import { LogDayButton } from "@/components/log-day-button";
import { StarredMark, TagBadge } from "@/components/markers";

export function chancesText(day: DayView): string | null {
  if (!day.chances) return null;
  return `Whistler ${pct(day.chances.whistler)}, Baker ${pct(day.chances.baker)}`;
}

export function loggableHills(day: DayView): HillId[] {
  if (!day.loggable.ok) return [];
  const hills = day.call && day.call !== "dog" ? [day.call] : HILL_IDS;
  return hills.filter((h) => day.hills[h].open);
}

export function LogButtons({ day, single }: { day: DayView; single: string }) {
  const hills = loggableHills(day);
  if (hills.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {hills.map((hill) => (
        <LogDayButton key={hill} date={day.date} hill={hill}>
          {hills.length === 1 ? single : `I skied ${hillShort(hill)}`}
        </LogDayButton>
      ))}
    </div>
  );
}

export function DayRow({
  day,
  today,
  bakerTravelPenalty,
  starred = [],
  interactive,
}: {
  day: DayView;
  today?: IsoDate;
  bakerTravelPenalty: number;
  starred?: (HillId | null)[];
  interactive: boolean;
}) {
  const isToday = today === day.date;
  const showHills = day.status === "forecast" || day.status === "outlook";
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{formatDay(day.date)}</CardTitle>
          {isToday ? (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-medium text-white">
              Today
            </span>
          ) : null}
          <TagBadge tag={day.tag} />
          {interactive ? <StarredMark starred={starred} /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {day.status === "past" ? <p className="text-slate-600">Past</p> : null}
        {day.status === "logged" && day.logged ? <SkiedBadge hill={day.logged} /> : null}
        {day.status === "preseason" ? <CallBadge call="dog" tense="live" /> : null}
        {showHills && day.call ? <CallBadge call={day.call} tense="live" /> : null}
        {showHills && !day.call && day.chances ? (
          <p className="text-sm text-slate-700">{chancesText(day)}</p>
        ) : null}
        {day.note ? <p className="text-sm break-words text-slate-700">{day.note}</p> : null}
        {showHills ? (
          <div className="grid gap-2 sm:grid-cols-2">
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
        {interactive ? <LogButtons day={day} single="I skied this" /> : null}
        {interactive && isToday && !day.loggable.ok && day.status !== "logged" ? (
          <p className="text-sm break-words text-slate-600">{day.loggable.reason}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
