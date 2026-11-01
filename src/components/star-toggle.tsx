"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toggleWatch } from "@/server/actions";
import type { HillId, IsoDate } from "@/engine/types";

export function StarToggle({
  saturday,
  hill,
  starred,
  label,
  showText = false,
}: {
  saturday: IsoDate;
  hill: HillId | null;
  starred: boolean;
  label: string;
  showText?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [on, setOn] = useOptimistic(starred);

  function onClick() {
    startTransition(async () => {
      setOn(!on);
      const result = await toggleWatch(saturday, hill);
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant={showText ? "outline" : "ghost"}
      size={showText ? "sm" : "icon"}
      aria-pressed={on}
      aria-label={showText ? undefined : label}
      disabled={pending}
      onClick={onClick}
    >
      <Star
        className={cn(on ? "fill-amber-400 text-amber-500" : "text-slate-500")}
        aria-hidden
      />
      {showText ? label : null}
    </Button>
  );
}
