import { Mountain, PawPrint, Trees, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { callLabel } from "@/engine/labels";
import type { Call, HillId, Tense } from "@/engine/types";

export const CALL_STYLE: Record<
  Call,
  { icon: LucideIcon; box: string; iconClass: string; soft: string }
> = {
  whistler: {
    icon: Mountain,
    box: "bg-sky-50 text-sky-950 ring-sky-200",
    iconClass: "text-sky-600",
    soft: "bg-sky-100 text-sky-900",
  },
  baker: {
    icon: Trees,
    box: "bg-emerald-50 text-emerald-950 ring-emerald-200",
    iconClass: "text-emerald-700",
    soft: "bg-emerald-100 text-emerald-900",
  },
  dog: {
    icon: PawPrint,
    box: "bg-amber-50 text-amber-950 ring-amber-200",
    iconClass: "text-amber-600",
    soft: "bg-amber-100 text-amber-900",
  },
};

const HILL_SHORT: Record<HillId, string> = { whistler: "Whistler", baker: "Baker" };

export function hillShort(hill: HillId): string {
  return HILL_SHORT[hill];
}

export function CallBadge({
  call,
  tense,
  className,
}: {
  call: Call;
  tense: Tense;
  className?: string;
}) {
  const { label, subtitle } = callLabel(call, tense);
  const style = CALL_STYLE[call];
  const Icon = style.icon;
  return (
    <div
      className={cn(
        "flex max-w-full min-w-0 items-start gap-2.5 rounded-lg px-3 py-2 ring-1",
        style.box,
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", style.iconClass)} aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold break-words">{label}</p>
        {subtitle ? <p className="text-sm break-words opacity-80">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function CompactCallBadge({
  call,
  tense,
  tooltip = true,
  text,
}: {
  call: Call;
  tense: Tense;
  tooltip?: boolean;
  text?: string;
}) {
  const { label, subtitle } = callLabel(call, tense);
  const style = CALL_STYLE[call];
  const Icon = style.icon;
  const className = cn(
    "inline-flex max-w-full min-w-0 items-center gap-1 rounded-full px-2 py-0.5 text-left text-xs font-medium ring-1",
    style.box,
  );
  const body = (
    <>
      <Icon className={cn("size-3.5 shrink-0", style.iconClass)} aria-hidden />
      <span className="min-w-0 break-words">{text ?? label}</span>
    </>
  );
  const hint = text ? [label, subtitle].filter(Boolean).join(". ") : subtitle;
  if (!hint) return <span className={className}>{body}</span>;
  if (!tooltip) {
    return (
      <span className={className} title={hint}>
        {body}
        <span className="sr-only">. {hint}</span>
      </span>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger type="button" className={className}>
        {body}
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  );
}

export function SkiedBadge({ hill }: { hill: HillId }) {
  const style = CALL_STYLE[hill];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        style.box,
      )}
    >
      <Icon className={cn("size-3.5 shrink-0", style.iconClass)} aria-hidden />
      Skied {hillShort(hill)}
    </span>
  );
}
