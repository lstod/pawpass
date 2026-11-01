"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CalendarRange, Sun } from "lucide-react";
import { finishOnboarding, saveSettings } from "@/server/actions";
import type { UserPrefs } from "@/engine/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CallBadge } from "@/components/call-badge";
import { toDraft, toInput, type Draft } from "@/components/settings/draft";
import {
  AvyPenaltyFields,
  BakerPenaltyField,
  DogFloorField,
  PassesFields,
  ScoreScale,
  TerrainField,
  VisibilityField,
} from "@/components/settings/fields";

interface Step {
  eyebrow?: string;
  title: string;
  description: string;
  keys: (keyof Draft)[];
}

const STEPS: Step[] = [
  {
    title: "What PawPass does",
    description:
      "Every week of the ski season it answers one question: is this weekend worth one of your limited ski days, or does the dog get it?",
    keys: [],
  },
  {
    title: "Your passes",
    description: "How many days you have, and when your season runs.",
    keys: ["whistlerDays", "bakerDays", "firstSkiDay", "lastSkiDay"],
  },
  {
    eyebrow: "How you ski",
    title: "Whistler terrain",
    description: "Where you ski decides which rain counts against a day.",
    keys: ["whistlerLowBand"],
  },
  {
    eyebrow: "How you ski",
    title: "Visibility",
    description: "Some skiers chase powder in any light; some only go when it's clear.",
    keys: ["visibilityPref"],
  },
  {
    eyebrow: "How you ski",
    title: "Dog floor",
    description: "A ski day has to beat this score before it's worth more than a day with the dog.",
    keys: ["dogFloor"],
  },
  {
    eyebrow: "How you ski",
    title: "Baker travel penalty",
    description: "Baker isn't on the pass, and getting there can be more work.",
    keys: ["bakerTravelPenalty"],
  },
  {
    eyebrow: "How you ski",
    title: "Avalanche-control penalties",
    description: "After a big dump the alpine can stay closed all morning.",
    keys: ["avyPenaltyWhistler", "avyPenaltyBaker"],
  },
  {
    title: "Where to look",
    description: "That's it. You can change any of this in Settings.",
    keys: [],
  },
];

export function Walkthrough({ prefs }: { prefs: UserPrefs }) {
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => toDraft(prefs));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  function onChange<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function next() {
    setError(null);
    startTransition(async () => {
      if (step.keys.length > 0) {
        const result = await saveSettings(toInput(draft, step.keys));
        if (!result.ok) {
          setError(result.error);
          return;
        }
      }
      setIndex((i) => Math.min(i + 1, STEPS.length - 1));
    });
  }

  function back() {
    setError(null);
    setIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <Progress
          value={((index + 1) / STEPS.length) * 100}
          aria-label={`Step ${index + 1} of ${STEPS.length}`}
          className="mb-2"
        />
        <p className="text-xs font-medium text-slate-500">
          Step {index + 1} of {STEPS.length}
          {step.eyebrow ? ` · ${step.eyebrow}` : ""}
        </p>
        <CardTitle className="text-xl">
          <h1>{step.title}</h1>
        </CardTitle>
        <CardDescription>{step.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {index === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">Each Saturday and Sunday gets one of three calls:</p>
            <CallBadge call="whistler" tense="live" />
            <CallBadge call="baker" tense="live" />
            <CallBadge call="dog" tense="live" />
            <p className="text-sm text-slate-700">
              It scores each day from the forecast, weighs it against the days you have left and
              the rest of the season, and shows its reasons one tap away.
            </p>
          </div>
        ) : null}
        {index === 1 ? <PassesFields draft={draft} onChange={onChange} full={false} /> : null}
        {index === 2 ? <TerrainField value={draft.whistlerLowBand} onChange={onChange} /> : null}
        {index === 3 ? <VisibilityField value={draft.visibilityPref} onChange={onChange} /> : null}
        {index === 4 ? (
          <>
            <ScoreScale />
            <DogFloorField value={draft.dogFloor} onChange={onChange} />
          </>
        ) : null}
        {index === 5 ? (
          <BakerPenaltyField value={draft.bakerTravelPenalty} onChange={onChange} />
        ) : null}
        {index === 6 ? (
          <AvyPenaltyFields
            whistler={draft.avyPenaltyWhistler}
            baker={draft.avyPenaltyBaker}
            onChange={onChange}
          />
        ) : null}
        {last ? (
          <ul className="space-y-3">
            <li className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <Sun className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
              <span className="min-w-0 text-sm">
                <span className="block font-medium">This weekend</span>
                The call for Saturday and Sunday, with the scores and reasons behind it. Before
                your season starts, it previews a weekend from last season.
              </span>
            </li>
            <li className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
              <CalendarRange className="mt-0.5 size-5 shrink-0 text-sky-600" aria-hidden />
              <span className="min-w-0 text-sm">
                <span className="block font-medium">Season</span>
                Every weekend to your last ski day, with the chance of skiing each one. Star the
                ones worth watching.
              </span>
            </li>
          </ul>
        ) : null}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription className="break-words">{error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {index > 0 ? (
            <Button type="button" variant="outline" onClick={back} disabled={pending}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
          ) : null}
          <form action={finishOnboarding}>
            <Button type="submit" variant="ghost" disabled={pending}>
              Skip
            </Button>
          </form>
        </div>
        {last ? (
          <form action={finishOnboarding}>
            <Button type="submit">Finish</Button>
          </form>
        ) : (
          <Button type="button" onClick={next} disabled={pending}>
            Next
            <ArrowRight aria-hidden />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
