import { pathSamples, scoreCache } from "./curve";
import { HILL_IDS, LIVE_SEASONS } from "./hills";
import { POSTSEASON_NOTE, PRESEASON_NOTE, bakerPenaltyNote } from "./labels";
import { outlook } from "./outlook";
import { bars, buildPlan, choose, type Plan } from "./plan";
import { scoreDay } from "./score";
import {
  addDays,
  currentWeekend,
  dayOfWeek,
  daysBetween,
  hillOpenOn,
  loggable,
  saturdayOf,
  todayInVancouver,
  weekendDays,
} from "./time";
import type {
  Call,
  CallChances,
  DayScore,
  DayTag,
  DayView,
  DaysLeft,
  HillDayView,
  HillId,
  IsoDate,
  Loggable,
  Sample,
  UserPrefs,
  WeatherByDate,
  WeekendView,
} from "./types";

export const FORECAST_DAYS = 7;
export const EARLY_FORECAST_DAYS = 15;
export const LIKELY_AT = 0.5;
export const WORTH_WATCHING_AT = 0.5;

const CALL_ORDER: Call[] = ["whistler", "baker", "dog"];

export interface SimDay {
  /** Index into the planning table. */
  d: number;
  open: Record<HillId, boolean>;
  /** Forecast scores, used on every path when set. */
  fixed: Sample | null;
  /** One entry per path; null means no history, so the dog gets the day. */
  paths: (Sample | null)[];
}

export interface SimDayResult {
  chances: CallChances;
  /** The most common days-left state going into the day, first path's on a tie. */
  before: DaysLeft;
  expectedLeftAfter: DaysLeft;
}

/** Walks every path through the days in order, carrying days left along. Deterministic. */
export function simulate(
  days: SimDay[],
  plan: Plan,
  prefs: UserPrefs,
  start: DaysLeft,
  pathCount: number,
): SimDayResult[] {
  const paths = Math.max(1, pathCount);
  const counts = days.map(() => ({ whistler: 0, baker: 0, dog: 0 }));
  const leftSum = days.map(() => ({ whistler: 0, baker: 0 }));
  const states = days.map(() => new Map<string, number>());
  for (let p = 0; p < paths; p++) {
    let w = start.whistler;
    let b = start.baker;
    days.forEach((day, i) => {
      const key = `${w},${b}`;
      states[i].set(key, (states[i].get(key) ?? 0) + 1);
      const s = day.fixed ?? day.paths[p] ?? null;
      const call: Call = s ? choose(s.w, s.b, day.d, w, b, plan, prefs, day.open) : "dog";
      if (call === "whistler") w--;
      if (call === "baker") b--;
      counts[i][call]++;
      leftSum[i].whistler += w;
      leftSum[i].baker += b;
    });
  }
  return days.map((_, i) => {
    let modal = "";
    let best = -1;
    for (const [key, n] of states[i]) {
      if (n > best) {
        best = n;
        modal = key;
      }
    }
    const [w, b] = modal.split(",").map(Number);
    return {
      chances: {
        whistler: counts[i].whistler / paths,
        baker: counts[i].baker / paths,
        dog: counts[i].dog / paths,
      },
      before: { whistler: w, baker: b },
      expectedLeftAfter: { whistler: leftSum[i].whistler / paths, baker: leftSum[i].baker / paths },
    };
  });
}

/** The call with a chance of 50% or more, if any. */
export function likelyCall(chances: CallChances | null): Call | null {
  if (!chances) return null;
  return CALL_ORDER.find((c) => chances[c] >= LIKELY_AT) ?? null;
}

/** Chance a hill clears the day's bar: from the forecast score in range, else from the outlook. */
export function chanceOfClearing(day: DayView, hill: HillId): number {
  const h = day.hills[hill];
  if (h.bar === null) return 0;
  if (day.status === "forecast") return h.forecast && h.forecast.score >= h.bar ? 1 : 0;
  if (day.status === "outlook") return h.outlook?.chanceAboveBar ?? 0;
  return 0;
}

export function worthWatching(days: DayView[]): boolean {
  return days.some((d) => HILL_IDS.some((h) => chanceOfClearing(d, h) >= WORTH_WATCHING_AT));
}

export function tagFor(daysOut: number): DayTag {
  if (daysOut <= FORECAST_DAYS) return "Forecast";
  if (daysOut <= EARLY_FORECAST_DAYS) return "Early forecast";
  return "Historical outlook";
}

export interface SeasonViewInput {
  today: IsoDate;
  /** Season dates and open dates here decide what is in season and open. */
  prefs: UserPrefs;
  seasons: number[];
  actuals: Record<HillId, WeatherByDate>;
  forecasts: Record<HillId, WeatherByDate>;
  logged: Map<IsoDate, HillId>;
  daysLeft: DaysLeft;
  loggable: (date: IsoDate, logged: HillId | null) => Loggable;
}

export interface SeasonViews {
  day(date: IsoDate): DayView;
  weekend(saturday: IsoDate): WeekendView;
}

function openOn(date: IsoDate, prefs: UserPrefs): Record<HillId, boolean> {
  return { whistler: hillOpenOn(date, "whistler", prefs), baker: hillOpenOn(date, "baker", prefs) };
}

function clampLeft(left: DaysLeft, prefs: UserPrefs): DaysLeft {
  return {
    whistler: Math.max(0, Math.min(prefs.whistlerDays, left.whistler)),
    baker: Math.max(0, Math.min(prefs.bakerDays, left.baker)),
  };
}

/** Builds day and weekend views over one season: the plan, the forward walk and each day's call. */
export function seasonViews(input: SeasonViewInput): SeasonViews {
  const { today, prefs, seasons, actuals, forecasts, logged } = input;
  const seasonDays = weekendDays(prefs.firstSkiDay, prefs.lastSkiDay);
  const index = new Map(seasonDays.map((d, i) => [d, i]));
  const score = scoreCache(prefs, actuals);
  const paths = seasonDays.map((d) => pathSamples(d, seasons, score));
  const samples = paths.map((p) => p.filter((s): s is Sample => s !== null));
  const plan = buildPlan(
    seasonDays.map((date, i) => ({ date, samples: samples[i], open: openOn(date, prefs) })),
    prefs.whistlerDays,
    prefs.bakerDays,
    prefs,
  );

  const forecastCache = new Map<IsoDate, Record<HillId, DayScore | null>>();
  const forecastFor = (date: IsoDate): Record<HillId, DayScore | null> => {
    let f = forecastCache.get(date);
    if (!f) {
      const w = forecasts.whistler[date];
      const b = forecasts.baker[date];
      f = {
        whistler: w ? scoreDay(w, "whistler", prefs) : null,
        baker: b ? scoreDay(b, "baker", prefs) : null,
      };
      forecastCache.set(date, f);
    }
    return f;
  };
  const inForecastRange = (date: IsoDate): boolean => {
    const out = daysBetween(today, date);
    const f = forecastFor(date);
    return out >= 0 && out <= FORECAST_DAYS && f.whistler !== null && f.baker !== null;
  };

  const walkDates = seasonDays.filter((d) => d >= today && !logged.has(d));
  const results = simulate(
    walkDates.map((date) => {
      const i = index.get(date) ?? 0;
      const f = forecastFor(date);
      return {
        d: i,
        open: openOn(date, prefs),
        fixed: inForecastRange(date) && f.whistler && f.baker ? { w: f.whistler.score, b: f.baker.score } : null,
        paths: paths[i],
      };
    }),
    plan,
    prefs,
    clampLeft(input.daysLeft, prefs),
    seasons.length * 7,
  );
  const sim = new Map(walkDates.map((d, i) => [d, results[i]]));

  function day(date: IsoDate): DayView {
    const daysOut = daysBetween(today, date);
    const loggedHill = logged.get(date) ?? null;
    const open = openOn(date, prefs);
    const f = daysOut >= 0 && daysOut <= EARLY_FORECAST_DAYS ? forecastFor(date) : { whistler: null, baker: null };
    const hills: Record<HillId, HillDayView> = {
      whistler: { open: open.whistler, forecast: f.whistler, outlook: null, bar: null },
      baker: { open: open.baker, forecast: f.baker, outlook: null, bar: null },
    };
    const view: DayView = {
      date,
      weekday: dayOfWeek(date) === 6 ? "Sat" : "Sun",
      daysOut,
      status: "outlook",
      tag: tagFor(daysOut),
      call: null,
      note: null,
      logged: loggedHill,
      hills,
      chances: null,
      likely: null,
      expectedLeftAfter: null,
      loggable: input.loggable(date, loggedHill),
    };

    const i = index.get(date);
    const result = sim.get(date);
    if (loggedHill) return { ...view, status: "logged" };
    if (daysOut < 0) return { ...view, status: "past" };
    if (i === undefined || !result) {
      return {
        ...view,
        status: "preseason",
        call: "dog",
        note: date < prefs.firstSkiDay ? PRESEASON_NOTE : POSTSEASON_NOTE,
      };
    }

    const { whistler: w, baker: b } = result.before;
    const dayBars = bars(i, w, b, plan, prefs, open);
    hills.whistler.bar = dayBars.whistler;
    hills.baker.bar = dayBars.baker;
    const shared = {
      chances: result.chances,
      likely: likelyCall(result.chances),
      expectedLeftAfter: result.expectedLeftAfter,
    };

    if (inForecastRange(date) && f.whistler && f.baker) {
      const sW = f.whistler.score;
      const sB = f.baker.score;
      const call = choose(sW, sB, i, w, b, plan, prefs, open);
      const penalty = prefs.bakerTravelPenalty;
      const lostToPenalty =
        call === "whistler" &&
        penalty > 0 &&
        sB > sW &&
        choose(sW, sB, i, w, b, plan, { ...prefs, bakerTravelPenalty: 0 }, open) === "baker";
      return {
        ...view,
        ...shared,
        status: "forecast",
        call,
        note: lostToPenalty ? bakerPenaltyNote(sB - sW, penalty) : null,
      };
    }

    for (const h of HILL_IDS) {
      hills[h].outlook = outlook(
        samples[i].map((s) => (h === "whistler" ? s.w : s.b)),
        hills[h].bar,
      );
    }
    return { ...view, ...shared, status: "outlook" };
  }

  function weekend(saturday: IsoDate): WeekendView {
    const days = [day(saturday), day(addDays(saturday, 1))];
    return { saturday, days, worthWatching: worthWatching(days) };
  }

  return { day, weekend };
}

export function daysLeftFromLog(prefs: UserPrefs, log: { date: IsoDate; hill: HillId }[]): DaysLeft {
  const inSeason = log.filter((r) => r.date >= prefs.firstSkiDay && r.date <= prefs.lastSkiDay);
  return {
    whistler: Math.max(0, prefs.whistlerDays - inSeason.filter((r) => r.hill === "whistler").length),
    baker: Math.max(0, prefs.bakerDays - inSeason.filter((r) => r.hill === "baker").length),
  };
}

export interface LiveSeasonInput {
  now: Date;
  prefs: UserPrefs;
  log: { date: IsoDate; hill: HillId }[];
  forecasts: Record<HillId, WeatherByDate>;
  actuals: Record<HillId, WeatherByDate>;
}

export function liveSeason(input: LiveSeasonInput): {
  today: IsoDate;
  daysLeft: DaysLeft;
  current: WeekendView;
  weekends: WeekendView[];
} {
  const { prefs } = input;
  const today = todayInVancouver(input.now);
  const daysLeft = daysLeftFromLog(prefs, input.log);
  const views = seasonViews({
    today,
    prefs,
    seasons: LIVE_SEASONS,
    actuals: input.actuals,
    forecasts: input.forecasts,
    logged: new Map(input.log.map((r) => [r.date, r.hill])),
    daysLeft,
    loggable: (date, loggedHill) => {
      if (loggedHill) return { ok: false, reason: `You already logged ${date}` };
      const each = HILL_IDS.map((h) => loggable(date, h, today, prefs, daysLeft));
      return each.find((l) => l.ok) ?? each[0];
    },
  });

  const current = views.weekend(currentWeekend(today).saturday);
  const firstWeekend = saturdayOf(prefs.firstSkiDay);
  const weekends: WeekendView[] = [];
  for (
    let s = current.saturday > firstWeekend ? current.saturday : firstWeekend;
    s <= prefs.lastSkiDay;
    s = addDays(s, 7)
  ) {
    weekends.push(s === current.saturday ? current : views.weekend(s));
  }
  return { today, daysLeft, current, weekends };
}
