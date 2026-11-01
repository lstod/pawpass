import { Mountain, PawPrint, Trees } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DaysLeft } from "@/engine/types";

function share(left: number, of: number): number {
  return of > 0 ? Math.max(0, Math.min(100, (left / of) * 100)) : 0;
}

export function DaysLeftCards({
  daysLeft,
  allowance,
  dogDays,
}: {
  daysLeft: DaysLeft;
  allowance: DaysLeft;
  dogDays?: number;
}) {
  return (
    <div className={dogDays === undefined ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
      <Card size="sm" className="min-w-0">
        <CardContent className="space-y-1.5">
          <p className="flex items-center gap-1 text-xs text-slate-600">
            <Mountain className="size-3.5 shrink-0 text-sky-600" aria-hidden />
            Whistler days left
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {daysLeft.whistler}
            <span className="text-sm font-normal text-slate-500"> of {allowance.whistler}</span>
          </p>
          <Progress
            value={share(daysLeft.whistler, allowance.whistler)}
            aria-label="Whistler days left"
            className="[&_[data-slot=progress-indicator]]:bg-sky-600"
          />
        </CardContent>
      </Card>
      <Card size="sm" className="min-w-0">
        <CardContent className="space-y-1.5">
          <p className="flex items-center gap-1 text-xs text-slate-600">
            <Trees className="size-3.5 shrink-0 text-emerald-700" aria-hidden />
            Baker days left
          </p>
          <p className="text-xl font-semibold tabular-nums">
            {daysLeft.baker}
            <span className="text-sm font-normal text-slate-500"> of {allowance.baker}</span>
          </p>
        </CardContent>
      </Card>
      {dogDays !== undefined ? (
        <Card size="sm" className="min-w-0">
          <CardContent className="space-y-1.5">
            <p className="flex items-center gap-1 text-xs text-slate-600">
              <PawPrint className="size-3.5 shrink-0 text-amber-600" aria-hidden />
              Dog days so far
            </p>
            <p className="text-xl font-semibold tabular-nums">{dogDays}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
