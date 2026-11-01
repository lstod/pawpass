import { CalendarClock, CalendarDays, Eye, History, Star } from "lucide-react";
import { WORTH_WATCHING } from "@/engine/labels";
import type { DayTag, HillId } from "@/engine/types";
import { hillShort } from "@/components/call-badge";

const TAG_ICON = {
  Forecast: CalendarDays,
  "Early forecast": CalendarClock,
  "Historical outlook": History,
} as const;

export function TagBadge({ tag }: { tag: DayTag }) {
  const Icon = TAG_ICON[tag];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {tag}
    </span>
  );
}

export function WorthWatching() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-900 ring-1 ring-violet-200">
      <Eye className="size-3.5 shrink-0 text-violet-600" aria-hidden />
      {WORTH_WATCHING}
    </span>
  );
}

export function starredText(starred: (HillId | null)[]): string | null {
  if (starred.length === 0) return null;
  if (starred.includes(null)) return "Starred";
  return `Starred: ${starred.map((h) => hillShort(h as HillId)).join(" and ")}`;
}

export function StarredMark({ starred }: { starred: (HillId | null)[] }) {
  const text = starredText(starred);
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
      <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-500" aria-hidden />
      {text}
    </span>
  );
}
