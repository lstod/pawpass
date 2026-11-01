import type { HillId, IsoDate, LowBandId } from "./types";

export interface LowBand {
  id: LowBandId;
  label: string;
  elevation: number;
}

export interface Hill {
  id: HillId;
  name: string;
  lat: number;
  lon: number;
  lowBands: LowBand[];
  summitElevation: number;
  /** 2025-26 public opening, used by the replay and the preview. */
  replayOpenDate: IsoDate;
}

export const HILLS: Record<HillId, Hill> = {
  whistler: {
    id: "whistler",
    name: "Whistler",
    lat: 50.06,
    lon: -122.95,
    lowBands: [
      { id: "base", label: "Base and up", elevation: 675 },
      { id: "mid", label: "Mid-mountain and up", elevation: 1300 },
    ],
    summitElevation: 2182,
    replayOpenDate: "2025-11-21",
  },
  baker: {
    id: "baker",
    name: "Mt Baker",
    lat: 48.862,
    lon: -121.666,
    lowBands: [{ id: "base", label: "Base", elevation: 1067 }],
    summitElevation: 1551,
    replayOpenDate: "2025-12-22",
  },
};

export const HILL_IDS: HillId[] = ["whistler", "baker"];

/** Live training seasons by start year: 2017-18 to 2025-26. */
export const LIVE_SEASONS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
/** Replay training seasons: 2025-26 held out. */
export const REPLAY_SEASONS = LIVE_SEASONS.filter((y) => y !== 2025);

export const REPLAY_START: IsoDate = "2025-11-01";
export const REPLAY_END: IsoDate = "2026-04-30";
export const DEFAULT_PREVIEW_SATURDAY: IsoDate = "2026-02-07";

export function lowBand(hill: HillId, band: LowBandId): LowBand {
  const bands = HILLS[hill].lowBands;
  return bands.find((b) => b.id === band) ?? bands[0];
}
