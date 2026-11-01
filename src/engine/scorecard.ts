import { buildPlan } from "./plan";
import { callValue, replay, replayContext, scoresOn, walk } from "./replay";
import { SIMPLE_RULE_MIN_SCORE } from "./score";
import type {
  Call,
  HillId,
  ReplayDay,
  Scorecard,
  StrategyKey,
  StrategyResult,
  UserPrefs,
  WeatherByDate,
} from "./types";

const EPS = 1e-9;

export function scorecard(
  prefs: UserPrefs,
  actuals: Record<HillId, WeatherByDate>,
  fri: Record<HillId, WeatherByDate>,
  wed: Record<HillId, WeatherByDate>,
  days: ReplayDay[] = replay(prefs, actuals, fri, wed),
): Scorecard {
  const ctx = replayContext(prefs, actuals);
  const p = ctx.prefs;
  const n = ctx.dates.length;
  const value = (calls: Call[]) => calls.reduce((sum, c, i) => sum + callValue(c, ctx.actual[i], p), 0);

  const friday = days.reduce((sum, d) => sum + d.value, 0);
  const wednesday = value(days.map((d) => d.wednesday.call));

  const simpleCalls: Call[] = [];
  let w = p.whistlerDays;
  let b = p.bakerDays;
  ctx.dates.forEach((date, i) => {
    const s = scoresOn(date, fri, p);
    const options: { hill: HillId; net: number }[] = [];
    if (ctx.open[i].whistler && w > 0 && s.whistler) options.push({ hill: "whistler", net: s.whistler.score });
    if (ctx.open[i].baker && b > 0 && s.baker) {
      options.push({ hill: "baker", net: s.baker.score - p.bakerTravelPenalty });
    }
    const best = options.reduce<(typeof options)[number] | null>((a, o) => (a && a.net >= o.net ? a : o), null);
    const call: Call = best && best.net >= SIMPLE_RULE_MIN_SCORE ? best.hill : "dog";
    if (call === "whistler") w--;
    if (call === "baker") b--;
    simpleCalls.push(call);
  });
  const simple = value(simpleCalls);

  const alwaysDog = p.dogFloor * n;

  const actualScores = (i: number) => ({
    whistler: ctx.actual[i].whistler.score,
    baker: ctx.actual[i].baker.score,
  });
  const hindsightPlan = buildPlan(
    ctx.dates.map((date, i) => ({
      date,
      open: ctx.open[i],
      samples: [{ w: ctx.actual[i].whistler.score, b: ctx.actual[i].baker.score }],
    })),
    p.whistlerDays,
    p.bakerDays,
    p,
  );
  const hindsight = value(walk(ctx, actualScores, hindsightPlan).map((s) => s.call));
  const plannerOnActuals = value(walk(ctx, actualScores).map((s) => s.call));

  const gain = hindsight - alwaysDog;
  const noGain = gain <= EPS;
  const result = (key: StrategyKey, points: number): StrategyResult => ({
    key,
    points,
    share: noGain ? null : (points - alwaysDog) / gain,
    pctOfHindsight: hindsight > 0 ? points / hindsight : 0,
  });

  return {
    strategies: {
      friday: result("friday", friday),
      wednesday: result("wednesday", wednesday),
      simple: result("simple", simple),
      alwaysDog: result("alwaysDog", alwaysDog),
      hindsight: result("hindsight", hindsight),
    },
    noGain,
    forecastErrorCost: plannerOnActuals - friday,
    daysSpent: days.flatMap((d) => (d.friday.call === "dog" ? [] : [{ date: d.date, call: d.friday.call }])),
    replayDays: n,
  };
}