import { NO_GAIN_TEXT, STRATEGY_LABELS } from "@/engine/labels";
import type { Scorecard, StrategyKey } from "@/engine/types";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ORDER: StrategyKey[] = ["friday", "wednesday", "simple", "alwaysDog", "hindsight"];

function percent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export function ScorecardStats({ card }: { card: Scorecard }) {
  return (
    <div className="space-y-4">
      {card.noGain ? (
        <p className="rounded-lg bg-amber-50 p-3 text-amber-950 ring-1 ring-amber-200">
          {NO_GAIN_TEXT}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((key) => {
          const result = card.strategies[key];
          const { label, subtitle } = STRATEGY_LABELS[key];
          const headline = key === "friday";
          const ofHindsight = Number.isFinite(result.pctOfHindsight)
            ? percent(result.pctOfHindsight)
            : null;
          return (
            <Card
              key={key}
              className={cn("min-w-0", headline && "ring-2 ring-sky-300 sm:col-span-2 lg:col-span-4")}
            >
              <CardHeader>
                <CardTitle className={headline ? "text-lg" : undefined}>{label}</CardTitle>
                {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
              </CardHeader>
              <CardContent className="space-y-1">
                {!card.noGain ? (
                  <p
                    className={cn(
                      "font-semibold tabular-nums",
                      headline ? "text-5xl" : "text-3xl",
                    )}
                  >
                    {result.share === null ? "–" : percent(result.share)}
                  </p>
                ) : null}
                {!card.noGain && ofHindsight ? (
                  <p className="text-sm text-slate-600">{ofHindsight} of hindsight</p>
                ) : null}
                <p className={cn("text-slate-600", card.noGain ? "text-2xl font-semibold text-slate-900" : "text-sm")}>
                  {Math.round(result.points)} points
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
