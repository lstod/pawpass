import type { Metadata } from "next";
import { requireViewer } from "@/server/session";
import { scorecardPage } from "@/server/views";
import { HILLS } from "@/engine/hills";
import { formatDay } from "@/engine/time";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CALL_STYLE } from "@/components/call-badge";
import { ScorecardStats } from "@/components/scorecard/scorecard-stats";

export const metadata: Metadata = { title: "Scorecard · PawPass" };

export default async function ScorecardPage() {
  const viewer = await requireViewer();
  const { card } = await scorecardPage(viewer);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Scorecard</h1>
        <p className="text-slate-700">
          How much of the gain over staying home with the dog each strategy captured, out of what
          knowing the weather in advance would have captured.
        </p>
        <p className="text-sm text-slate-600">Over {card.replayDays} replayed days of 2025-26.</p>
      </div>

      <ScorecardStats card={card} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Forecast error cost: {Math.round(card.forecastErrorCost)} points</CardTitle>
            <CardDescription>
              What imperfect forecasts cost the Friday planner: the same planner given the actual
              weather on Friday, minus what it scored on Friday&apos;s forecast.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Days the Friday planner spent</CardTitle>
          </CardHeader>
          <CardContent>
            {card.daysSpent.length === 0 ? (
              <p className="text-slate-600">None. The dog got every day.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {card.daysSpent.map((d) => {
                  const style = CALL_STYLE[d.call];
                  const Icon = style.icon;
                  return (
                    <li
                      key={d.date}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm ring-1",
                        style.box,
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", style.iconClass)} aria-hidden />
                      {formatDay(d.date)} · {HILLS[d.call].name}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
