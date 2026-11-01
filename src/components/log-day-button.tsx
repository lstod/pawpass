"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logDay } from "@/server/actions";
import { formatDay } from "@/engine/time";
import { HILLS } from "@/engine/hills";
import type { HillId, IsoDate } from "@/engine/types";

export function LogDayButton({
  date,
  hill,
  children,
}: {
  date: IsoDate;
  hill: HillId;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await logDay(date, hill);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="min-w-0">
      <Button
        type="button"
        size="lg"
        onClick={onClick}
        disabled={pending}
      >
        <Check aria-hidden />
        {children}
        <span className="sr-only">
          {" "}
          ({HILLS[hill].name}, {formatDay(date)})
        </span>
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-sm break-words text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
