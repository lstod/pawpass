"use client";

import { useId } from "react";
import { ChevronDown, Mountain, MountainSnow, Scale, Snowflake, Sun } from "lucide-react";
import {
  DOG_FLOOR_BANDS,
  HOW_A_SCORE_IS_BUILT,
  PENALTY_HELPER,
  SCORE_MARKERS,
  SCORE_SCALE_LINE,
  terrainPoints,
  thresholdTag,
  visibilityPoints,
} from "@/engine/labels";
import type { LowBandId, VisibilityPref } from "@/engine/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import type { Draft } from "@/components/settings/draft";

type Change = <K extends keyof Draft>(key: K, value: Draft[K]) => void;

const TERRAIN: { value: LowBandId; label: string; icon: typeof Mountain }[] = [
  { value: "base", label: "Base and up, 675 m", icon: Mountain },
  { value: "mid", label: "Mid-mountain and up, 1,300 m", icon: MountainSnow },
];

const VISIBILITY: { value: VisibilityPref; label: string; icon: typeof Mountain }[] = [
  { value: "powder", label: "Powder over everything", icon: Snowflake },
  { value: "balanced", label: "Balanced", icon: Scale },
  { value: "bluebird", label: "Bluebird or bust", icon: Sun },
];

function OptionGroup<V extends string>({
  legend,
  helper,
  value,
  options,
  points,
  onChange,
}: {
  legend: string;
  helper: string;
  value: V;
  options: { value: V; label: string; icon: typeof Mountain }[];
  points: (v: V) => string;
  onChange: (v: V) => void;
}) {
  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <p className="text-sm text-slate-600">{helper}</p>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as V)} className="gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              className={cn(
                "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg p-3 ring-1",
                value === option.value ? "bg-slate-50 ring-slate-400" : "ring-slate-200",
              )}
            >
              <RadioGroupItem value={option.value} className="mt-0.5" />
              <Icon className="mt-0.5 size-4 shrink-0 text-slate-600" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-sm break-words text-slate-600">
                  {points(option.value)}
                </span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}

export function TerrainField({ value, onChange }: { value: LowBandId; onChange: Change }) {
  return (
    <OptionGroup
      legend="Whistler terrain"
      helper="The lowest elevation you ski at Whistler. Rain below it doesn't count."
      value={value}
      options={TERRAIN}
      points={terrainPoints}
      onChange={(v) => onChange("whistlerLowBand", v)}
    />
  );
}

export function VisibilityField({ value, onChange }: { value: VisibilityPref; onChange: Change }) {
  return (
    <OptionGroup
      legend="Visibility"
      helper="How much clear skies and flat light matter to you."
      value={value}
      options={VISIBILITY}
      points={visibilityPoints}
      onChange={(v) => onChange("visibilityPref", v)}
    />
  );
}

export function PointsSlider({
  label,
  helper,
  value,
  max,
  tag,
  onChange,
  children,
}: {
  label: string;
  helper: string;
  value: number;
  max: number;
  tag: string;
  onChange: (value: number) => void;
  children?: React.ReactNode;
}) {
  const id = useId();
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span id={id} className="text-sm font-medium">
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums">{value} pts</span>
      </div>
      <p className="text-sm text-slate-600">{helper}</p>
      <div className="px-1.5 py-2">
        <Slider
          aria-labelledby={id}
          value={[value]}
          min={0}
          max={max}
          step={1}
          onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as number))}
        />
      </div>
      {children}
      <p
        aria-live="polite"
        className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-sm font-medium break-words text-slate-800"
      >
        {tag}
      </p>
    </div>
  );
}

const BAND_COLOURS = ["bg-sky-100", "bg-sky-200", "bg-amber-100", "bg-amber-200", "bg-amber-300"];

function DogFloorScale({ value }: { value: number }) {
  const span = 101;
  return (
    <div className="space-y-2 px-1.5">
      <div className="relative h-4" aria-hidden>
        {SCORE_MARKERS.map((m) => (
          <span
            key={m.at}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${m.at}%` }}
          >
            <span className="text-[10px] leading-none font-semibold text-slate-700">{m.at}</span>
            <span className="h-2 w-px bg-slate-700" />
          </span>
        ))}
      </div>
      <div className="flex w-full gap-px overflow-hidden rounded-md">
        {DOG_FLOOR_BANDS.map((band, i) => {
          const active = value >= band.from && value <= band.to;
          return (
            <div
              key={band.from}
              className={cn(
                "min-w-0 px-1 py-1",
                BAND_COLOURS[i % BAND_COLOURS.length],
                active && "ring-2 ring-slate-700 ring-inset",
              )}
              style={{ flexBasis: `${((band.to - band.from + 1) / span) * 100}%` }}
            >
              <span className="block text-[10px] leading-tight break-words hyphens-auto text-slate-800">
                {band.tag}
              </span>
            </div>
          );
        })}
      </div>
      <ul className="space-y-0.5 text-xs text-slate-600">
        {SCORE_MARKERS.map((m) => (
          <li key={m.at} className="flex items-start gap-1.5">
            <span className="mt-1 h-2 w-px shrink-0 bg-slate-700" aria-hidden />
            {m.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DogFloorField({ value, onChange }: { value: number; onChange: Change }) {
  return (
    <PointsSlider
      label="Dog floor"
      helper="The score a ski day has to reach to beat a day with the dog."
      value={value}
      max={100}
      tag={thresholdTag("dogFloor", value)}
      onChange={(v) => onChange("dogFloor", v)}
    >
      <DogFloorScale value={value} />
    </PointsSlider>
  );
}

export function BakerPenaltyField({ value, onChange }: { value: number; onChange: Change }) {
  return (
    <PointsSlider
      label="Baker travel penalty"
      helper={PENALTY_HELPER}
      value={value}
      max={50}
      tag={thresholdTag("bakerTravelPenalty", value)}
      onChange={(v) => onChange("bakerTravelPenalty", v)}
    />
  );
}

const AVY_HELPER =
  "Points off the score on a storm morning when the alpine is likely closed. Not money.";

export function AvyPenaltyFields({
  whistler,
  baker,
  onChange,
}: {
  whistler: number;
  baker: number;
  onChange: Change;
}) {
  return (
    <div className="space-y-6">
      <PointsSlider
        label="Avalanche-control penalty at Whistler"
        helper={AVY_HELPER}
        value={whistler}
        max={50}
        tag={thresholdTag("avyPenalty", whistler)}
        onChange={(v) => onChange("avyPenaltyWhistler", v)}
      />
      <PointsSlider
        label="Avalanche-control penalty at Baker"
        helper={AVY_HELPER}
        value={baker}
        max={50}
        tag={thresholdTag("avyPenalty", baker)}
        onChange={(v) => onChange("avyPenaltyBaker", v)}
      />
    </div>
  );
}

export function ScoreScale() {
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-sm text-slate-700">{SCORE_SCALE_LINE}</p>
      <details className="group">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-slate-400 [&::-webkit-details-marker]:hidden">
          How a score is built
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {HOW_A_SCORE_IS_BUILT.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function TextField({
  id,
  label,
  type,
  value,
  onChange,
  helper,
  min,
  max,
}: {
  id: string;
  label: string;
  type: "number" | "date";
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        min={min}
        max={max}
        inputMode={type === "number" ? "numeric" : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {helper ? <p className="text-xs text-slate-600">{helper}</p> : null}
    </div>
  );
}

export function PassesFields({
  draft,
  onChange,
  full,
  logged,
}: {
  draft: Draft;
  onChange: Change;
  full: boolean;
  logged?: { whistler: number; baker: number };
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id="whistlerDays"
        label="Whistler days on your pass"
        type="number"
        min={0}
        value={draft.whistlerDays}
        onChange={(v) => onChange("whistlerDays", v)}
        helper={logged ? `${logged.whistler} logged so far` : undefined}
      />
      <TextField
        id="bakerDays"
        label="Baker days you allow yourself"
        type="number"
        min={0}
        value={draft.bakerDays}
        onChange={(v) => onChange("bakerDays", v)}
        helper={logged ? `${logged.baker} logged so far` : undefined}
      />
      <TextField
        id="firstSkiDay"
        label="First ski day"
        type="date"
        value={draft.firstSkiDay}
        onChange={(v) => onChange("firstSkiDay", v)}
      />
      <TextField
        id="lastSkiDay"
        label="Last ski day"
        type="date"
        value={draft.lastSkiDay}
        onChange={(v) => onChange("lastSkiDay", v)}
      />
      {full ? (
        <>
          <TextField
            id="whistlerOpenDate"
            label="Whistler opening date"
            type="date"
            value={draft.whistlerOpenDate}
            onChange={(v) => onChange("whistlerOpenDate", v)}
          />
          <TextField
            id="bakerOpenDate"
            label="Baker opening date"
            type="date"
            value={draft.bakerOpenDate}
            onChange={(v) => onChange("bakerOpenDate", v)}
          />
          <TextField
            id="bakerTicketUsd"
            label="Baker ticket ($ USD, for your own reference)"
            type="number"
            min={0}
            value={draft.bakerTicketUsd}
            onChange={(v) => onChange("bakerTicketUsd", v)}
          />
        </>
      ) : null}
    </div>
  );
}
