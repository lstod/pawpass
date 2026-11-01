import { describe, expect, it } from "vitest";
import {
  CALLS,
  DOG_FLOOR_BANDS,
  HOW_A_SCORE_IS_BUILT,
  PAST_COPY,
  STRATEGY_LABELS,
  bakerBarText,
  bakerPenaltyNote,
  breakdownLine,
  callLabel,
  terrainPoints,
  thresholdTag,
  visibilityPoints,
} from "./labels";

const liveTexts = CALLS.flatMap((c) => {
  const l = callLabel(c, "live");
  return [l.label, ...(l.subtitle ? [l.subtitle] : [])];
});

describe("call labels", () => {
  it("every call has a live and a past label", () => {
    for (const call of CALLS) {
      expect(callLabel(call, "live").label).toBeTruthy();
      expect(callLabel(call, "past").label).toBeTruthy();
    }
    expect(callLabel("whistler", "live").label).toBe("Whistler: spend a pass day");
    expect(callLabel("whistler", "past").label).toBe("Skied Whistler: spent a pass day");
    expect(callLabel("baker", "live").label).toBe("Baker: spend a Baker day");
    expect(callLabel("baker", "past").label).toBe("Skied Baker: spent a Baker day");
    expect(callLabel("dog", "live")).toEqual({
      label: "The dog gets the day",
      subtitle: "Skip skiing, go on a dog hike",
    });
    expect(callLabel("dog", "past")).toEqual({
      label: "The dog got the day",
      subtitle: "Skipped skiing, went on a dog hike",
    });
  });

  it("no past label or subtitle equals or contains any live label", () => {
    for (const call of CALLS) {
      const past = callLabel(call, "past");
      for (const text of [past.label, past.subtitle ?? ""]) {
        for (const live of liveTexts) {
          expect(text).not.toBe(live);
          expect(text.includes(live)).toBe(false);
        }
      }
    }
  });

  it("past copy contains no live label", () => {
    const past = [
      PAST_COPY.fridayCall,
      PAST_COPY.wednesdaySaid,
      PAST_COPY.callChanged,
      PAST_COPY.wasWorth(73),
      PAST_COPY.hadLeft(4, 2),
      PAST_COPY.missText(74, 51, "rain at 1,300 m"),
    ];
    for (const text of past) for (const live of liveTexts) expect(text.includes(live)).toBe(false);
    expect(PAST_COPY.wasWorth(73)).toBe("Was worth a day at 73+");
    expect(PAST_COPY.hadLeft(4, 2)).toBe("Had 4 Whistler and 2 Baker days left going in");
    expect(PAST_COPY.missText(74, 51, "rain at 1,300 m")).toBe(
      "The forecast missed: Friday said 74, it was 51: rain at 1,300 m",
    );
  });
});

describe("settings copy", () => {
  it("tags thresholds by band", () => {
    expect(thresholdTag("dogFloor", 0)).toBe("Almost any ski day beats a dog day");
    expect(thresholdTag("dogFloor", 20)).toBe("Almost any ski day beats a dog day");
    expect(thresholdTag("dogFloor", 21)).toBe("A decent day beats the dog");
    expect(thresholdTag("dogFloor", 35)).toBe("A decent day beats the dog");
    expect(thresholdTag("dogFloor", 100)).toBe("Only an epic day beats the dog");
    expect(thresholdTag("bakerTravelPenalty", 0)).toBe("Baker is as easy as Whistler for you");
    expect(thresholdTag("bakerTravelPenalty", 10)).toBe("Baker is a little more hassle");
    expect(thresholdTag("bakerTravelPenalty", 50)).toBe("Baker only for a big day");
    expect(thresholdTag("avyPenalty", 0)).toBe("A closed alpine morning doesn't bother you");
    expect(thresholdTag("avyPenalty", 20)).toBe("You'd rather ski the clear day after");
    expect(thresholdTag("avyPenalty", 31)).toBe("Storm mornings are a write-off");
  });

  it("dog floor bands cover 0 to 100 without gaps", () => {
    expect(DOG_FLOOR_BANDS[0].from).toBe(0);
    expect(DOG_FLOOR_BANDS.at(-1)?.to).toBe(100);
    for (let i = 1; i < DOG_FLOOR_BANDS.length; i++) {
      expect(DOG_FLOOR_BANDS[i].from).toBe(DOG_FLOOR_BANDS[i - 1].to + 1);
    }
  });

  it("states points from the scoring constants", () => {
    expect(visibilityPoints("bluebird")).toBe("A clear day +30, flat light \u221220, snowing all day \u221216 more");
    expect(visibilityPoints("balanced")).toBe("A clear day +15, flat light \u221210, snowing all day \u22128 more");
    expect(terrainPoints("base")).toBe("Rain at 675 m counts, up to \u221240");
    expect(terrainPoints("mid")).toBe("Rain at 1,300 m counts, up to \u221240");
    expect(HOW_A_SCORE_IS_BUILT.every((l) => !/earn/i.test(l))).toBe(true);
    expect(HOW_A_SCORE_IS_BUILT[0]).toContain("40 points");
  });

  it("writes a breakdown line", () => {
    expect(
      breakdownLine(
        [
          { label: "Ordinary day", points: 40 },
          { label: "22 cm new at the top in 3 days", points: 44 },
          { label: "Flat light", points: -8 },
        ],
        76,
      ),
    ).toBe("40 ordinary day, +44 22 cm new at the top in 3 days, \u22128 flat light = 76");
  });

  it("explains the Baker rule in points", () => {
    expect(bakerBarText(79, 10)).toBe("Worth a Baker day at 79+ (includes your 10-point travel penalty)");
    expect(bakerBarText(69, 0)).toBe("Worth a Baker day at 69+");
    expect(bakerPenaltyNote(2, 10)).toBe(
      "Baker scored 2 higher, but not enough to beat your 10-point travel penalty",
    );
  });

  it("names the strategies", () => {
    expect(STRATEGY_LABELS.simple).toEqual({
      label: "Simple rule",
      subtitle: "Ski whenever the forecast says 50 or more and you have days left",
    });
    expect(STRATEGY_LABELS.friday.label).toBe("Friday planner");
    expect(STRATEGY_LABELS.alwaysDog.label).toBe("Always dog");
  });
});
