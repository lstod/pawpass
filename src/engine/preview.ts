import { DEFAULT_PREVIEW_SATURDAY, REPLAY_SEASONS } from "./hills";
import { replay, replayPrefs, replayWindow } from "./replay";
import { seasonViews } from "./season";
import { addDays, dayOfWeek, formatDayWithYear, isIsoDate, weekendDays } from "./time";
import type { DaysLeft, HillId, IsoDate, UserPrefs, WeatherByDate, WeekendView } from "./types";

export const PREVIEW_ONLY = "Preview only";
export const NO_PREVIEW_TEXT = "No weekend from last season falls in your season dates";

export interface PreviewData {
  actuals: Record<HillId, WeatherByDate>;
  fri: Record<HillId, WeatherByDate>;
  wed: Record<HillId, WeatherByDate>;
}

export type Preview =
  | {
      saturday: IsoDate;
      friday: IsoDate;
      options: IsoDate[];
      banner: string;
      daysLeft: DaysLeft;
      weekend: WeekendView;
    }
  | { empty: true };

/** Saturdays in the user's replay window. */
export function previewOptions(prefs: UserPrefs): IsoDate[] {
  const w = replayWindow(prefs);
  return weekendDays(w.first, w.last).filter((d) => dayOfWeek(d) === 6);
}

export function pickPreviewSaturday(requested: string | undefined, options: IsoDate[]): IsoDate | null {
  if (options.length === 0) return null;
  if (isIsoDate(requested) && options.includes(requested)) return requested;
  return options.includes(DEFAULT_PREVIEW_SATURDAY) ? DEFAULT_PREVIEW_SATURDAY : options[0];
}

/** A 2025-26 weekend shown as "This weekend", as if today were the Friday before it. */
export function previewWeekend(saturday: string | undefined, prefs: UserPrefs, data: PreviewData): Preview {
  const options = previewOptions(prefs);
  const chosen = pickPreviewSaturday(saturday, options);
  if (!chosen) return { empty: true };
  const friday = addDays(chosen, -1);

  const before = replay(prefs, data.actuals, data.fri, data.wed).filter((d) => d.date < chosen);
  const daysLeft: DaysLeft = {
    whistler: prefs.whistlerDays - before.filter((d) => d.friday.call === "whistler").length,
    baker: prefs.bakerDays - before.filter((d) => d.friday.call === "baker").length,
  };

  const views = seasonViews({
    today: friday,
    prefs: replayPrefs(prefs),
    seasons: REPLAY_SEASONS,
    actuals: data.actuals,
    forecasts: data.fri,
    logged: new Map(),
    daysLeft,
    loggable: () => ({ ok: false, reason: PREVIEW_ONLY }),
  });

  return {
    saturday: chosen,
    friday,
    options,
    banner: `Preview: as if it were ${formatDayWithYear(friday)}, using that Friday's forecast`,
    daysLeft,
    weekend: views.weekend(chosen),
  };
}
