import { cn } from "@/lib/utils";
import { bakerBarText, whistlerBarText } from "@/engine/labels";
import { HILLS } from "@/engine/hills";
import type { HillDayView, HillId } from "@/engine/types";
import { CALL_STYLE } from "@/components/call-badge";
import { ReasonChips } from "@/components/reason-chips";
import { ScoreBreakdown } from "@/components/score-breakdown";

export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function barText(hill: HillId, bar: number, bakerTravelPenalty: number): string {
  return hill === "whistler" ? whistlerBarText(bar) : bakerBarText(bar, bakerTravelPenalty);
}

export function HillDetail({
  hill,
  view,
  bakerTravelPenalty,
}: {
  hill: HillId;
  view: HillDayView;
  bakerTravelPenalty: number;
}) {
  const style = CALL_STYLE[hill];
  const Icon = style.icon;
  return (
    <div className="min-w-0 space-y-1.5 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className={cn("size-4 shrink-0", style.iconClass)} aria-hidden />
        {HILLS[hill].name}
      </p>
      {!view.open ? (
        <p className="text-sm text-slate-600">Hill closed</p>
      ) : (
        <>
          {view.forecast ? (
            <ScoreBreakdown label="Forecast score" score={view.forecast} />
          ) : null}
          {view.outlook ? (
            <div className="text-sm text-slate-700">
              <p>
                Median {view.outlook.median} · 25th–75th percentile {view.outlook.p25}–
                {view.outlook.p75}
              </p>
              {view.bar !== null ? (
                <p>{pct(view.outlook.chanceAboveBar)} chance of clearing the bar</p>
              ) : null}
            </div>
          ) : null}
          {!view.forecast && !view.outlook ? (
            <p className="text-sm text-slate-600">No forecast yet</p>
          ) : null}
          {view.bar !== null ? (
            <p className="text-sm break-words text-slate-700">
              {barText(hill, view.bar, bakerTravelPenalty)}
            </p>
          ) : null}
          {view.forecast ? <ReasonChips parts={view.forecast.parts} /> : null}
        </>
      )}
    </div>
  );
}
