import { pathSamples, scoreCache } from "./curve";
import { HILLS, HILL_IDS, REPLAY_END, REPLAY_SEASONS, REPLAY_START } from "./hills";
import { bars, buildPlan, choose, type Plan } from "./plan";
import { scoreDay } from "./score";
import { addDays, dayOfWeek, daysBetween, hillOpenOn, mapToReplaySeason, weekendDays } from "./time";
import type {
  Call,
  DayScore,
  DaysLeft,
  HillId,
  IsoDate,
  ReplayCall,
  ReplayDay,
  Sample,
  UserPrefs,
  WeatherByDate,
} from "./types";

export const MISS_AT = 25;

export interface ReplayWindow {
  first: IsoDate;
  last: IsoDate;
}

function clampToReplay(d: IsoDate): IsoDate {
  return d < REPLAY_START ? REPLAY_START : d > REPLAY_END ? REPLAY_END : d;
}

/** The user's first ski day mapped onto 2025-26, keeping the season's length, clamped to the replay data. */
export function replayWindow(prefs: UserPrefs): ReplayWindow {
  const first = mapToReplaySeason(prefs.firstSkiDay);
  const last = addDays(first, daysBetween(prefs.firstSkiDay, prefs.lastSkiDay));
  return { first: clampToReplay(first), last: clampToReplay(last) };
}

/** The user's settings with 2025-26 season dates and opening dates. */
export function replayPrefs(prefs: UserPrefs): UserPrefs {
  const w = replayWindow(prefs);
  return {
    ...prefs,
    firstSkiDay: w.first,
    lastSkiDay: w.last,
    whistlerOpenDate: HILLS.whistler.replayOpenDate,
    bakerOpenDate: HILLS.baker.replayOpenDate,
  };
}

type Scores = Record<HillId, DayScore | null>;

export interface ReplayContext {
  prefs: UserPrefs;
  dates: IsoDate[];
  open: Record<HillId, boolean>[];
  actual: Record<HillId, DayScore>[];
  plan: Plan;
}

/** Replay days are the window's weekend days with actual weather at both hills. */
export function replayContext(prefs: UserPrefs, actuals: Record<HillId, WeatherByDate>): ReplayContext {
  const rp = replayPrefs(prefs);
  const dates = weekendDays(rp.firstSkiDay, rp.lastSkiDay).filter((d) => actuals.whistler[d] && actuals.baker[d]);
  const open = dates.map((d) => ({ whistler: hillOpenOn(d, "whistler", rp), baker: hillOpenOn(d, "baker", rp) }));
  const score = scoreCache(rp, actuals);
  const plan = buildPlan(
    dates.map((date, i) => ({
      date,
      open: open[i],
      samples: pathSamples(date, REPLAY_SEASONS, score).filter((s): s is Sample => s !== null),
    })),
    rp.whistlerDays,
    rp.bakerDays,
    rp,
  );
  const actual = dates.map((d) => ({
    whistler: scoreDay(actuals.whistler[d], "whistler", rp),
    baker: scoreDay(actuals.baker[d], "baker", rp),
  }));
  return { prefs: rp, dates, open, actual, plan };
}

export function scoresOn(date: IsoDate, weather: Record<HillId, WeatherByDate>, prefs: UserPrefs): Scores {
  const w = weather.whistler[date];
  const b = weather.baker[date];
  return {
    whistler: w ? scoreDay(w, "whistler", prefs) : null,
    baker: b ? scoreDay(b, "baker", prefs) : null,
  };
}

export interface WalkStep {
  call: Call;
  bars: Record<HillId, number | null>;
  before: DaysLeft;
  after: DaysLeft;
}

/** Walks the replay days choosing on the given scores; a hill without a score can't be chosen. */
export function walk(
  ctx: ReplayContext,
  scores: (i: number) => Record<HillId, number | null>,
  plan: Plan = ctx.plan,
): WalkStep[] {
  let w = ctx.prefs.whistlerDays;
  let b = ctx.prefs.bakerDays;
  return ctx.dates.map((_, i) => {
    const s = scores(i);
    const open = {
      whistler: ctx.open[i].whistler && s.whistler !== null,
      baker: ctx.open[i].baker && s.baker !== null,
    };
    const before = { whistler: w, baker: b };
    const dayBars = bars(i, w, b, plan, ctx.prefs, ctx.open[i]);
    const call = choose(s.whistler ?? 0, s.baker ?? 0, i, w, b, plan, ctx.prefs, open);
    if (call === "whistler") w--;
    if (call === "baker") b--;
    return { call, bars: dayBars, before, after: { whistler: w, baker: b } };
  });
}

/** Points a call earns on actual weather. */
export function callValue(call: Call, actual: Record<HillId, DayScore>, prefs: UserPrefs): number {
  if (call === "whistler") return actual.whistler.score;
  if (call === "baker") return actual.baker.score - prefs.bakerTravelPenalty;
  return prefs.dogFloor;
}

export function scoreValues(s: Scores): Record<HillId, number | null> {
  return { whistler: s.whistler?.score ?? null, baker: s.baker?.score ?? null };
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function missReason(actual: DayScore, forecast: number): string {
  if (actual.score < forecast) {
    const part = actual.parts.find((p) => p.points < 0);
    return part ? lowerFirst(part.label) : "it was flatter than forecast";
  }
  const part = actual.parts.find((p) => p.kind !== "base" && p.points > 0);
  return part ? lowerFirst(part.label) : "it was better than forecast";
}

function missFor(
  call: Call,
  friday: Scores,
  actual: Record<HillId, DayScore>,
  open: Record<HillId, boolean>,
): ReplayDay["miss"] {
  let hill: HillId | null = call === "dog" ? null : call;
  if (!hill) {
    const candidates = HILL_IDS.filter((h) => open[h] && friday[h] !== null);
    hill = candidates.reduce<HillId | null>(
      (best, h) => (best === null || (friday[h]?.score ?? 0) > (friday[best]?.score ?? 0) ? h : best),
      null,
    );
  }
  const forecast = hill ? friday[hill] : null;
  if (!hill || !forecast) return null;
  const a = actual[hill].score;
  if (Math.abs(forecast.score - a) < MISS_AT) return null;
  return { hill, forecast: forecast.score, actual: a, reason: missReason(actual[hill], forecast.score) };
}

export function replay(
  prefs: UserPrefs,
  actuals: Record<HillId, WeatherByDate>,
  fri: Record<HillId, WeatherByDate>,
  wed: Record<HillId, WeatherByDate>,
): ReplayDay[] {
  const ctx = replayContext(prefs, actuals);
  const friScores = ctx.dates.map((d) => scoresOn(d, fri, ctx.prefs));
  const wedScores = ctx.dates.map((d) => scoresOn(d, wed, ctx.prefs));
  const friWalk = walk(ctx, (i) => scoreValues(friScores[i]));
  const wedWalk = walk(ctx, (i) => scoreValues(wedScores[i]));
  return ctx.dates.map((date, i): ReplayDay => {
    const friday: ReplayCall = { call: friWalk[i].call, scores: friScores[i], bars: friWalk[i].bars };
    const wednesday: ReplayCall = { call: wedWalk[i].call, scores: wedScores[i], bars: wedWalk[i].bars };
    return {
      date,
      weekday: dayOfWeek(date) === 6 ? "Sat" : "Sun",
      open: ctx.open[i],
      friday,
      wednesday,
      changed: friday.call !== wednesday.call,
      actual: ctx.actual[i],
      leftBefore: friWalk[i].before,
      leftAfter: friWalk[i].after,
      value: callValue(friday.call, ctx.actual[i], ctx.prefs),
      miss: missFor(friday.call, friScores[i], ctx.actual[i], ctx.open[i]),
    };
  });
}
