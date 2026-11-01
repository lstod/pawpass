import { lowBand } from "./hills";
import type { DayScore, DayWeather, HillId, LowBandId, ScorePart, UserPrefs, VisibilityPref } from "./types";

/** Shared physical constants: starting estimates, not facts. */
export const BASE_POINTS = 40;
export const SNOW_POINTS_PER_CM = 2;
export const SNOW_MAX_POINTS = 50;
export const RAIN_POINTS_PER_MM = 8;
export const RAIN_MAX_POINTS = 40;
export const WARM_ABOVE_C = 3;
export const WARM_POINTS = 10;
export const WIND_HOLD_ABOVE_KMH = 50;
export const WIND_HOLD_POINTS = 20;
export const WIND_SOME_FROM_KMH = 35;
export const WIND_SOME_POINTS = 8;
export const VISIBILITY_WEIGHTS: Record<VisibilityPref, number> = {
  powder: 0.3,
  balanced: 1,
  bluebird: 2,
};
export const BLUEBIRD_BELOW_CLOUD = 30;
export const BLUEBIRD_POINTS = 15;
export const FLAT_ABOVE_CLOUD = 90;
export const FLAT_POINTS = 10;
export const SNOWING_FROM_CM = 5;
export const SNOWING_POINTS = 8;
export const AVY_SNOW24_CM = 25;
export const AVY_WINDY_SNOW24_CM = 15;
export const AVY_WIND_KMH = 40;
/** The simple rule skis when the better forecast reaches this. */
export const SIMPLE_RULE_MIN_SCORE = 50;

export const AVY_LABEL = "Big overnight dump: alpine likely closed for avalanche control this morning";

export function formatElevation(m: number): string {
  return `${m.toLocaleString("en-US")} m`;
}

function formatMm(mm: number): string {
  return mm >= 10 ? String(Math.round(mm)) : String(Math.round(mm * 10) / 10);
}

export function scoreLowBand(hill: HillId, prefs: UserPrefs): LowBandId {
  return hill === "whistler" ? prefs.whistlerLowBand : "base";
}

/** Visibility points for a preference, rounded the way scoreDay rounds them. */
export function visibilityPointsFor(pref: VisibilityPref): { bluebird: number; flat: number; snowing: number } {
  const weight = VISIBILITY_WEIGHTS[pref];
  return {
    bluebird: Math.round(BLUEBIRD_POINTS * weight),
    flat: -Math.round(FLAT_POINTS * weight),
    snowing: -Math.round(SNOWING_POINTS * weight),
  };
}

export function scoreDay(w: DayWeather, hill: HillId, prefs: UserPrefs): DayScore {
  const parts: ScorePart[] = [{ kind: "base", label: "Ordinary day", points: BASE_POINTS }];

  const snowCm = Math.round(w.snow72);
  if (snowCm >= 1) {
    parts.push({
      kind: "snow",
      label: `${snowCm} cm new at the top in 3 days`,
      points: Math.round(Math.min(SNOW_MAX_POINTS, w.snow72 * SNOW_POINTS_PER_CM)),
    });
  }

  const band = lowBand(hill, scoreLowBand(hill, prefs));
  const low = w.low[band.id];
  if (low) {
    const rainPoints = Math.round(Math.min(RAIN_MAX_POINTS, low.rain * RAIN_POINTS_PER_MM));
    if (rainPoints > 0) {
      parts.push({
        kind: "rain",
        label: `Rain at ${formatElevation(band.elevation)} (${formatMm(low.rain)} mm)`,
        points: -rainPoints,
      });
    }
    if (low.tempMax > WARM_ABOVE_C) {
      parts.push({
        kind: "warm",
        label: `Warm and heavy at ${formatElevation(band.elevation)}`,
        points: -WARM_POINTS,
      });
    }
  }

  if (w.windSummitMax > WIND_HOLD_ABOVE_KMH) {
    parts.push({ kind: "wind", label: "Wind holds likely", points: -WIND_HOLD_POINTS });
  } else if (w.windSummitMax >= WIND_SOME_FROM_KMH) {
    parts.push({ kind: "wind", label: "Some wind at the top", points: -WIND_SOME_POINTS });
  }

  const vis = visibilityPointsFor(prefs.visibilityPref);
  if (w.cloudMean < BLUEBIRD_BELOW_CLOUD && vis.bluebird !== 0) {
    parts.push({ kind: "bluebird", label: "Bluebird", points: vis.bluebird });
  }
  if (w.cloudMean > FLAT_ABOVE_CLOUD && vis.flat !== 0) {
    parts.push({ kind: "flat", label: "Flat light", points: vis.flat });
  }
  if (w.snowSkiHours >= SNOWING_FROM_CM && vis.snowing !== 0) {
    parts.push({ kind: "snowing", label: "Snowing all day, low visibility", points: vis.snowing });
  }

  const avyTriggered =
    w.snow24 >= AVY_SNOW24_CM ||
    (w.snow24 >= AVY_WINDY_SNOW24_CM && w.windSummitOvernightMax >= AVY_WIND_KMH);
  const avyPenalty = hill === "whistler" ? prefs.avyPenaltyWhistler : prefs.avyPenaltyBaker;
  if (avyTriggered && avyPenalty > 0) {
    parts.push({ kind: "avy", label: AVY_LABEL, points: -avyPenalty });
  }

  const raw = parts.reduce((sum, p) => sum + p.points, 0);
  return {
    score: Math.max(0, Math.min(100, Math.round(raw))),
    raw,
    parts,
    reasons: parts.filter((p) => p.kind !== "base").map((p) => p.label),
  };
}

/** Percentile 0..100 of a score against a hill's history: the share of history at or below it. Display only. */
export function scorePercentile(score: number, historyScores: number[]): number | null {
  if (historyScores.length === 0) return null;
  const atOrBelow = historyScores.filter((s) => s <= score).length;
  return Math.round((atOrBelow / historyScores.length) * 100);
}
