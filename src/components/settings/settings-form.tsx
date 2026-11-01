"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSettings } from "@/server/actions";
import type { DaysLeft, UserPrefs } from "@/engine/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ALL_KEYS, toDraft, toInput, type Draft } from "@/components/settings/draft";
import {
  AvyPenaltyFields,
  BakerPenaltyField,
  DogFloorField,
  PassesFields,
  ScoreScale,
  TerrainField,
  VisibilityField,
} from "@/components/settings/fields";

export function SettingsForm({ prefs, logged }: { prefs: UserPrefs; logged: DaysLeft }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(prefs));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onChange<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSettings(toInput(draft, ALL_KEYS));
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Season replayed with your settings");
      router.push("/season");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Your passes</CardTitle>
            <CardDescription>Your days and your season dates.</CardDescription>
          </CardHeader>
          <CardContent>
            <PassesFields draft={draft} onChange={onChange} full logged={logged} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>How you ski</CardTitle>
            <CardDescription>These turn the weather into a score for each day.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScoreScale />
            <TerrainField value={draft.whistlerLowBand} onChange={onChange} />
            <Separator />
            <VisibilityField value={draft.visibilityPref} onChange={onChange} />
            <Separator />
            <DogFloorField value={draft.dogFloor} onChange={onChange} />
            <Separator />
            <BakerPenaltyField value={draft.bakerTravelPenalty} onChange={onChange} />
            <Separator />
            <AvyPenaltyFields
              whistler={draft.avyPenaltyWhistler}
              baker={draft.avyPenaltyBaker}
              onChange={onChange}
            />
          </CardContent>
        </Card>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
