import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { callLabel } from "@/engine/labels";
import type { Call, DayScore, ReplayDay, Scorecard, StrategyKey } from "@/engine/types";
import { ReplayDayRow } from "@/components/last-season/replay-day-row";
import { ScorecardStats } from "@/components/scorecard/scorecard-stats";

const CALLS: Call[] = ["whistler", "baker", "dog"];

function score(value: number): DayScore {
  return {
    score: value,
    raw: value,
    parts: [
      { kind: "base", label: "ordinary day", points: 40 },
      { kind: "snow", label: "22 cm new", points: value - 40 },
    ],
    reasons: ["22 cm new"],
  };
}

const replayDay: ReplayDay = {
  date: "2026-02-07",
  weekday: "Sat",
  open: { whistler: true, baker: true },
  friday: {
    call: "whistler",
    scores: { whistler: score(74), baker: score(60) },
    bars: { whistler: 73, baker: 79 },
  },
  wednesday: {
    call: "dog",
    scores: { whistler: score(55), baker: score(50) },
    bars: { whistler: 73, baker: 79 },
  },
  changed: true,
  actual: { whistler: score(51), baker: score(58) },
  leftBefore: { whistler: 4, baker: 2 },
  leftAfter: { whistler: 3, baker: 2 },
  value: 11,
  miss: { hill: "whistler", forecast: 74, actual: 51, reason: "rain at 1,300 m" },
};

describe("last-season row", () => {
  it("renders past-tense labels only", () => {
    const html = renderToStaticMarkup(createElement(ReplayDayRow, { day: replayDay }));
    const whistler = callLabel("whistler", "past");
    const dog = callLabel("dog", "past");
    expect(html).toContain(whistler.label);
    if (whistler.subtitle) expect(html).toContain(whistler.subtitle);
    expect(html).toContain(dog.label);
    for (const call of CALLS) {
      const live = callLabel(call, "live");
      expect(html).not.toContain(live.label);
      if (live.subtitle) expect(html).not.toContain(live.subtitle);
    }
  });
});

describe("scorecard stats", () => {
  it("shows the no-gain message and no percentages", () => {
    const keys: StrategyKey[] = ["friday", "wednesday", "simple", "alwaysDog", "hindsight"];
    const card: Scorecard = {
      strategies: Object.fromEntries(
        keys.map((key) => [key, { key, points: 120, share: null, pctOfHindsight: 1 }]),
      ) as Scorecard["strategies"],
      noGain: true,
      forecastErrorCost: 0,
      daysSpent: [],
      replayDays: 40,
    };
    const html = renderToStaticMarkup(createElement(ScorecardStats, { card }));
    expect(html).toContain("No ski day beat a dog day last season with these settings");
    expect(html).not.toContain("%");
  });
});
