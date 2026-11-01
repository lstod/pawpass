"use client";

import { useState, useTransition } from "react";
import { Mountain, Trees } from "lucide-react";
import { logDay } from "@/server/actions";
import type { HillId, IsoDate } from "@/engine/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function LogDayForm({ today }: { today: IsoDate }) {
  const [date, setDate] = useState<IsoDate>(today);
  const [hill, setHill] = useState<HillId>("whistler");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await logDay(date, hill);
      setMessage(result.ok ? { ok: true, text: "Logged." } : { ok: false, text: result.error });
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="log-date">Date</Label>
        <Input
          id="log-date"
          type="date"
          value={date}
          max={today}
          required
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Hill</legend>
        <RadioGroup
          value={hill}
          onValueChange={(v) => setHill(v as HillId)}
          className="flex flex-wrap gap-4"
        >
          <Label className="font-normal">
            <RadioGroupItem value="whistler" />
            <Mountain className="size-4 text-sky-600" aria-hidden />
            Whistler
          </Label>
          <Label className="font-normal">
            <RadioGroupItem value="baker" />
            <Trees className="size-4 text-emerald-700" aria-hidden />
            Baker
          </Label>
        </RadioGroup>
      </fieldset>
      <Button type="submit" disabled={pending}>
        Log day
      </Button>
      {message ? (
        message.ok ? (
          <p role="status" className="text-sm text-slate-700">
            {message.text}
          </p>
        ) : (
          <Alert variant="destructive">
            <AlertDescription className="break-words">{message.text}</AlertDescription>
          </Alert>
        )
      ) : null}
    </form>
  );
}
