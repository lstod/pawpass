import { lowBand } from "./hills";
import {
  BASE_POINTS,
  RAIN_MAX_POINTS,
  SIMPLE_RULE_MIN_SCORE,
  SNOW_MAX_POINTS,
  WARM_POINTS,
  WIND_HOLD_POINTS,
  WIND_SOME_POINTS,
  formatElevation,
  visibilityPointsFor,
} from "./score";
import type { Call, HillId, LowBandId, StrategyKey, Tense, VisibilityPref } from "./types";

export const HILL_NAMES: Record<HillId, string> = { whistler: "Whistler", baker: "Baker" };

const MINUS = "\u2212";

function signed(points: number): string {
  return points < 0 ? `${MINUS}${-points}` : `+${points}`;
}

const CALL_LABELS: Record<Call, Record<Tense, { label: string; subtitle: string | null }>> = {
  whistler: {
    live: { label: "Whistler: spend a pass day", subtitle: null },
    past: { label: "Skied Whistler: spent a pass day", subtitle: null },
  },
  baker: {
    live: { label: "Baker: spend a Baker day", subtitle: null },
    past: { label: "Skied Baker: spent a Baker day", subtitle: null },
  },
  dog: {
    live: { label: "The dog gets the day", subtitle: "Skip skiing, go on a dog hike" },
    past: { label: "The dog got the day", subtitle: "Skipped skiing, went on a dog hike" },
  },
};

export const CALLS: Call[] = ["whistler", "baker", "dog"];

export function callLabel(call: Call, tense: Tense): { label: string; subtitle: string | null } {
  return CALL_LABELS[call][tense];
}

export const LIKELY_LABELS: Record<Call, string> = {
  whistler: "Whistler likely",
  baker: "Baker likely",
  dog: "Dog likely",
};
export const EITHER_WAY = "Could go either way";
export const WORTH_WATCHING = "Worth watching";

export interface ThresholdBand {
  from: number;
  to: number;
  tag: string;
}

export const DOG_FLOOR_BANDS: ThresholdBand[] = [
  { from: 0, to: 20, tag: "Almost any ski day beats a dog day" },
  { from: 21, to: 40, tag: "A decent day beats the dog" },
  { from: 41, to: 60, tag: "Only a good day beats the dog" },
  { from: 61, to: 80, tag: "Only a really good day beats the dog" },
  { from: 81, to: 100, tag: "Only an epic day beats the dog" },
];

export const BAKER_TRAVEL_BANDS: ThresholdBand[] = [
  { from: 0, to: 0, tag: "Baker is as easy as Whistler for you" },
  { from: 1, to: 15, tag: "Baker is a little more hassle" },
  { from: 16, to: 30, tag: "Baker has to be clearly better" },
  { from: 31, to: 50, tag: "Baker only for a big day" },
];

export const AVY_PENALTY_BANDS: ThresholdBand[] = [
  { from: 0, to: 0, tag: "A closed alpine morning doesn't bother you" },
  { from: 1, to: 15, tag: "A slow morning costs you a little" },
  { from: 16, to: 30, tag: "You'd rather ski the clear day after" },
  { from: 31, to: 50, tag: "Storm mornings are a write-off" },
];

const BANDS: Record<"dogFloor" | "bakerTravelPenalty" | "avyPenalty", ThresholdBand[]> = {
  dogFloor: DOG_FLOOR_BANDS,
  bakerTravelPenalty: BAKER_TRAVEL_BANDS,
  avyPenalty: AVY_PENALTY_BANDS,
};

export function thresholdTag(kind: "dogFloor" | "bakerTravelPenalty" | "avyPenalty", value: number): string {
  const bands = BANDS[kind];
  const v = Math.round(value);
  return (bands.find((b) => v >= b.from && v <= b.to) ?? (v < bands[0].from ? bands[0] : bands[bands.length - 1])).tag;
}

export const SCORE_MARKERS = [
  { at: 40, label: "Ordinary day ~40" },
  { at: 70, label: "Good day ~70" },
  { at: 85, label: "Great day 85+ (30 cm, dry and calm)" },
];

export const SCORE_SCALE_LINE =
  "Scores run 0 to 100. Around 40 is an ordinary day, 70 a good one, 85 and up a great one (say 30 cm, dry and calm).";

export const PENALTY_HELPER = "Points off Baker's score for the drive and the border. Not money.";

export function pointsValue(points: number): string {
  return `${points} pts`;
}

/** "A clear day +30, flat light −20, snowing all day −16 more". */
export function visibilityPoints(pref: VisibilityPref): string {
  const v = visibilityPointsFor(pref);
  return `A clear day ${signed(v.bluebird)}, flat light ${signed(v.flat)}, snowing all day ${signed(v.snowing)} more`;
}

/** "Rain at 675 m counts, up to −40". */
export function terrainPoints(band: LowBandId): string {
  return `Rain at ${formatElevation(lowBand("whistler", band).elevation)} counts, up to ${MINUS}${RAIN_MAX_POINTS}`;
}

export const HOW_A_SCORE_IS_BUILT: string[] = [
  `Start at ${BASE_POINTS} points for an ordinary day`,
  `+ up to ${SNOW_MAX_POINTS} points for fresh snow at the top over 3 days`,
  `${MINUS} up to ${RAIN_MAX_POINTS} points for rain at your lowest elevation`,
  `${MINUS}${WARM_POINTS} points when it's warm at your lowest elevation`,
  `${MINUS}${WIND_SOME_POINTS} points for some wind at the top, ${MINUS}${WIND_HOLD_POINTS} when wind holds are likely`,
  "± points for visibility, scaled by how much it matters to you",
  `${MINUS} your avalanche-control penalty after a big overnight dump`,
];

/** "40 ordinary day, +44 22 cm new, −8 flat light = 76". */
export function breakdownLine(parts: { label: string; points: number }[], score: number): string {
  const terms = parts.map((p, i) => {
    const label = p.label.charAt(0).toLowerCase() + p.label.slice(1);
    return i === 0 ? `${p.points} ${label}` : `${signed(p.points)} ${label}`;
  });
  return `${terms.join(", ")} = ${score}`;
}

export function bakerBarText(bar: number, penalty: number): string {
  const base = `Worth a Baker day at ${bar}+`;
  return penalty > 0 ? `${base} (includes your ${penalty}-point travel penalty)` : base;
}

export function whistlerBarText(bar: number): string {
  return `Worth a Whistler day at ${bar}+`;
}

export function bakerPenaltyNote(diff: number, penalty: number): string {
  return `Baker scored ${diff} higher, but not enough to beat your ${penalty}-point travel penalty`;
}

export const STRATEGY_LABELS: Record<StrategyKey, { label: string; subtitle: string | null }> = {
  friday: { label: "Friday planner", subtitle: null },
  wednesday: { label: "Wednesday planner", subtitle: null },
  simple: {
    label: "Simple rule",
    subtitle: `Ski whenever the forecast says ${SIMPLE_RULE_MIN_SCORE} or more and you have days left`,
  },
  alwaysDog: { label: "Always dog", subtitle: null },
  hindsight: { label: "Hindsight", subtitle: null },
};

export const NO_GAIN_TEXT = "No ski day beat a dog day last season with these settings";

export const PRESEASON_NOTE = "Before your first ski day";
export const POSTSEASON_NOTE = "After your last ski day";
export const NO_HISTORY_TEXT = "No history for this date";

function days(n: number): string {
  return n === 1 ? "day" : "days";
}

export const PAST_COPY = {
  fridayCall: "Friday's call",
  wednesdaySaid: "Wednesday said",
  callChanged: "Call changed",
  wasWorth: (bar: number) => `Was worth a day at ${bar}+`,
  hadLeft: (w: number, b: number) => `Had ${w} Whistler and ${b} Baker ${days(b)} left going in`,
  missText: (forecast: number, actual: number, reason: string) =>
    `The forecast missed: Friday said ${forecast}, it was ${actual}: ${reason}`,
};
