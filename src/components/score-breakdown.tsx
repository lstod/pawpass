import { ChevronDown } from "lucide-react";
import { breakdownLine } from "@/engine/labels";
import type { DayScore } from "@/engine/types";

export function ScoreBreakdown({ label, score }: { label: string; score: DayScore }) {
  return (
    <details className="group min-w-0">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-slate-400 [&::-webkit-details-marker]:hidden">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{score.score}</span>
        <ChevronDown
          className="size-4 text-slate-500 transition-transform group-open:rotate-180"
          aria-hidden
        />
        <span className="sr-only">Show the points</span>
      </summary>
      <p className="mt-1 text-sm break-words text-slate-600">
        {breakdownLine(score.parts, score.score)}
      </p>
    </details>
  );
}
