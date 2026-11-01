import { ACTUALS, FORECAST_FRI, FORECAST_WED } from "@/engine/data";
import { previewWeekend } from "@/engine/preview";
import { replay } from "@/engine/replay";
import { scorecard } from "@/engine/scorecard";
import { liveSeason } from "@/engine/season";
import { addDays, dayOfWeek, timeInVancouver, weekendDays } from "@/engine/time";
import type {
  DaysLeft,
  HillId,
  IsoDate,
  ReplayDay,
  Scorecard,
  UserPrefs,
  WeekendView,
} from "@/engine/types";
import { getDb } from "./db";
import { listLog, type LogEntry } from "./log";
import { readForecastMeta, readForecasts } from "./refresh";
import type { Viewer } from "./session";
import { countLogged } from "./settings";
import { listWatch } from "./watch";

export type Preview = ReturnType<typeof previewWeekend>;

function allowance(prefs: UserPrefs): DaysLeft {
  return { whistler: prefs.whistlerDays, baker: prefs.bakerDays };
}

function live(viewer: Viewer, now = new Date()) {
  const db = getDb();
  const log = listLog(db, viewer.userId);
  const season = liveSeason({
    now,
    prefs: viewer.prefs,
    log: log.map((e) => ({ date: e.date, hill: e.hill })),
    forecasts: readForecasts(db),
    actuals: ACTUALS,
  });
  return { db, log, season };
}

function starsFor(viewer: Viewer, saturday: IsoDate): (HillId | null)[] {
  return listWatch(getDb(), viewer.userId)
    .filter((w) => w.date === saturday)
    .map((w) => w.hill);
}

function preview(prefs: UserPrefs, saturday?: string): Preview {
  return previewWeekend(saturday, prefs, { actuals: ACTUALS, fri: FORECAST_FRI, wed: FORECAST_WED });
}

export async function weekendPage(viewer: Viewer, previewParam?: string) {
  const { db, log, season } = live(viewer);
  const { prefs } = viewer;
  const preseason = season.today < prefs.firstSkiDay;
  const meta = readForecastMeta(db);
  const yesterday = addDays(season.today, -1);
  const lastPast = yesterday < prefs.lastSkiDay ? yesterday : prefs.lastSkiDay;
  const pastWeekendDays = lastPast >= prefs.firstSkiDay ? weekendDays(prefs.firstSkiDay, lastPast) : [];
  const skied = new Set(log.map((e) => e.date));
  const dogDaysSoFar = pastWeekendDays.filter((d) => !skied.has(d) && [0, 6].includes(dayOfWeek(d))).length;
  return {
    today: season.today,
    daysLeft: season.daysLeft,
    allowance: allowance(prefs),
    dogDaysSoFar,
    forecastAsOf: meta.lastOkAt ? timeInVancouver(meta.lastOkAt) : null,
    current: season.current as WeekendView,
    starred: starsFor(viewer, season.current.saturday),
    preseason,
    preview: preseason || previewParam !== undefined ? preview(prefs, previewParam) : null,
  };
}

export async function seasonPage(viewer: Viewer) {
  const { season } = live(viewer);
  const watch = listWatch(getDb(), viewer.userId);
  return {
    today: season.today,
    daysLeft: season.daysLeft,
    allowance: allowance(viewer.prefs),
    weekends: season.weekends.map((w) => ({
      ...w,
      starred: watch.filter((s) => s.date === w.saturday).map((s) => s.hill),
    })),
  };
}

export async function daysPage(viewer: Viewer) {
  const { log, season } = live(viewer);
  return {
    today: season.today,
    daysLeft: season.daysLeft,
    allowance: allowance(viewer.prefs),
    entries: log as LogEntry[],
  };
}

export async function lastSeasonPage(viewer: Viewer): Promise<{ days: ReplayDay[]; prefs: UserPrefs }> {
  return { days: replay(viewer.prefs, ACTUALS, FORECAST_FRI, FORECAST_WED), prefs: viewer.prefs };
}

export async function scorecardPage(viewer: Viewer): Promise<{ card: Scorecard; prefs: UserPrefs }> {
  return { card: scorecard(viewer.prefs, ACTUALS, FORECAST_FRI, FORECAST_WED), prefs: viewer.prefs };
}

export async function settingsPage(viewer: Viewer) {
  const { prefs } = viewer;
  return {
    prefs,
    logged: countLogged(getDb(), viewer.userId, prefs.firstSkiDay, prefs.lastSkiDay),
    isDemo: viewer.isDemo,
  };
}
