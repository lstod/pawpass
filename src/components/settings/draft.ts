import type { LowBandId, UserPrefs, VisibilityPref } from "@/engine/types";

export interface Draft {
  whistlerDays: string;
  bakerDays: string;
  firstSkiDay: string;
  lastSkiDay: string;
  whistlerOpenDate: string;
  bakerOpenDate: string;
  bakerTicketUsd: string;
  whistlerLowBand: LowBandId;
  visibilityPref: VisibilityPref;
  dogFloor: number;
  bakerTravelPenalty: number;
  avyPenaltyWhistler: number;
  avyPenaltyBaker: number;
}

export type SettingsInput = Partial<Record<keyof UserPrefs, string | number | null>>;

export function toDraft(prefs: UserPrefs): Draft {
  return {
    whistlerDays: String(prefs.whistlerDays),
    bakerDays: String(prefs.bakerDays),
    firstSkiDay: prefs.firstSkiDay,
    lastSkiDay: prefs.lastSkiDay,
    whistlerOpenDate: prefs.whistlerOpenDate,
    bakerOpenDate: prefs.bakerOpenDate,
    bakerTicketUsd: prefs.bakerTicketUsd === null ? "" : String(prefs.bakerTicketUsd),
    whistlerLowBand: prefs.whistlerLowBand,
    visibilityPref: prefs.visibilityPref,
    dogFloor: prefs.dogFloor,
    bakerTravelPenalty: prefs.bakerTravelPenalty,
    avyPenaltyWhistler: prefs.avyPenaltyWhistler,
    avyPenaltyBaker: prefs.avyPenaltyBaker,
  };
}

function numberOrRaw(value: string): number | string {
  const trimmed = value.trim();
  const n = Number(trimmed);
  return trimmed !== "" && Number.isFinite(n) ? n : value;
}

export function toInput(draft: Draft, keys: (keyof Draft)[]): SettingsInput {
  const out: SettingsInput = {};
  for (const key of keys) {
    const value = draft[key];
    if (key === "whistlerDays" || key === "bakerDays") out[key] = numberOrRaw(value as string);
    else if (key === "bakerTicketUsd")
      out[key] = (value as string).trim() === "" ? null : numberOrRaw(value as string);
    else out[key] = value;
  }
  return out;
}

export const ALL_KEYS: (keyof Draft)[] = [
  "whistlerDays",
  "bakerDays",
  "firstSkiDay",
  "lastSkiDay",
  "whistlerOpenDate",
  "bakerOpenDate",
  "bakerTicketUsd",
  "whistlerLowBand",
  "visibilityPref",
  "dogFloor",
  "bakerTravelPenalty",
  "avyPenaltyWhistler",
  "avyPenaltyBaker",
];
