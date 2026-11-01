import {
  CloudFog,
  CloudRain,
  ShieldAlert,
  Snowflake,
  Sun,
  Thermometer,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { PartKind, ScorePart } from "@/engine/types";

const KIND: Record<Exclude<PartKind, "base">, { icon: LucideIcon; title: string }> = {
  snow: { icon: Snowflake, title: "Fresh snow" },
  bluebird: { icon: Sun, title: "Bluebird" },
  flat: { icon: CloudFog, title: "Flat light" },
  snowing: { icon: CloudFog, title: "Snowing" },
  wind: { icon: Wind, title: "Wind" },
  rain: { icon: CloudRain, title: "Rain" },
  warm: { icon: Thermometer, title: "Warm" },
  avy: { icon: ShieldAlert, title: "Avalanche control" },
};

export function signedPoints(points: number): string {
  return points < 0 ? `\u2212${Math.abs(points)}` : `+${points}`;
}

export function ReasonChips({ parts }: { parts: ScorePart[] }) {
  const reasons = parts.filter(
    (p): p is ScorePart & { kind: Exclude<PartKind, "base"> } => p.kind !== "base",
  );
  if (reasons.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Reasons">
      {reasons.map((part, i) => {
        const { icon: Icon, title } = KIND[part.kind];
        return (
          <li key={`${part.kind}-${i}`} className="max-w-full min-w-0">
            <Tooltip>
              <TooltipTrigger
                type="button"
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-left text-xs text-slate-700 ring-1 ring-slate-200 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{part.label}</span>
              </TooltipTrigger>
              <TooltipContent>
                {title}: {part.label}, {signedPoints(part.points)} points
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}
