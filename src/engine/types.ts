export type IsoDate = string;
export type HillId = "whistler" | "baker";
export type LowBandId = "base" | "mid";
export type Call = HillId | "dog";
export type VisibilityPref = "powder" | "balanced" | "bluebird";
export type Tense = "live" | "past";

export interface LowBandWeather {
  /** Rain at this elevation, 09:00 to 16:00, mm. */
  rain: number;
  /** Max temperature at this elevation, 09:00 to 16:00, °C. */
  tempMax: number;
}

/** One hill's weather for one Vancouver day, aggregated from hourly data. */
export interface DayWeather {
  /** Summit snowfall, 09:00 the day before to 09:00 on the day, cm. */
  snow24: number;
  /** Summit snowfall over the 72 hours to 09:00 on the day, cm. */
  snow72: number;
  low: Partial<Record<LowBandId, LowBandWeather>>;
  /** Max summit wind, 09:00 to 16:00, km/h. */
  windSummitMax: number;
  /** Max summit wind over the snow24 window, km/h. */
  windSummitOvernightMax: number;
  /** Mean summit cloud cover, 09:00 to 16:00, %. */
  cloudMean: number;
  /** Summit snowfall 09:00 to 16:00, cm. */
  snowSkiHours: number;
}

export type WeatherByDate = Record<IsoDate, DayWeather>;

export interface UserPrefs {
  whistlerDays: number;
  bakerDays: number;
  firstSkiDay: IsoDate;
  lastSkiDay: IsoDate;
  whistlerOpenDate: IsoDate;
  bakerOpenDate: IsoDate;
  whistlerLowBand: LowBandId;
  visibilityPref: VisibilityPref;
  dogFloor: number;
  bakerTravelPenalty: number;
  avyPenaltyWhistler: number;
  avyPenaltyBaker: number;
  bakerTicketUsd: number | null;
}

export const DEFAULT_PREFS: UserPrefs = {
  whistlerDays: 5,
  bakerDays: 2,
  firstSkiDay: "2026-11-21",
  lastSkiDay: "2027-04-10",
  whistlerOpenDate: "2026-11-21",
  bakerOpenDate: "2026-12-05",
  whistlerLowBand: "base",
  visibilityPref: "balanced",
  dogFloor: 35,
  bakerTravelPenalty: 10,
  avyPenaltyWhistler: 20,
  avyPenaltyBaker: 10,
  bakerTicketUsd: null,
};

/** Liam's settings, given to every "Try the demo" skier. */
export const DEMO_PREFS: UserPrefs = {
  ...DEFAULT_PREFS,
  whistlerDays: 5,
  bakerDays: 2,
  whistlerLowBand: "mid",
  visibilityPref: "balanced",
  bakerTravelPenalty: 0,
  avyPenaltyWhistler: 20,
  avyPenaltyBaker: 10,
  lastSkiDay: "2027-04-10",
};

export type PartKind =
  | "base"
  | "snow"
  | "rain"
  | "warm"
  | "wind"
  | "bluebird"
  | "flat"
  | "snowing"
  | "avy";

/** One scoring rule that fired. Reason chips and the points breakdown both come from these. */
export interface ScorePart {
  kind: PartKind;
  label: string;
  points: number;
}

export interface DayScore {
  /** Clamped 0..100. */
  score: number;
  /** Sum of parts before clamping. */
  raw: number;
  parts: ScorePart[];
  /** Labels of every part except the base. */
  reasons: string[];
}

/** One historical or forecast sample: the paired Whistler and Baker scores for one date. */
export interface Sample {
  w: number;
  b: number;
}

export interface DaysLeft {
  whistler: number;
  baker: number;
}

export interface Outlook {
  median: number;
  p25: number;
  p75: number;
  /** Share 0..1 of samples at or above the bar. */
  chanceAboveBar: number;
}

export type DayTag = "Forecast" | "Early forecast" | "Historical outlook";

export type Loggable = { ok: true } | { ok: false; reason: string };

export interface HillDayView {
  open: boolean;
  /** Forecast score when a stored forecast exists for 0 to 15 days out (or a replay/preview forecast). */
  forecast: DayScore | null;
  /** Historical outlook, beyond 7 days out (and 8 to 15 alongside the forecast). */
  outlook: Outlook | null;
  /** Score needed to justify spending a day here; null when the hill can't be chosen. Baker's includes its travel penalty. */
  bar: number | null;
}

export interface CallChances {
  whistler: number;
  baker: number;
  dog: number;
}

/** Everything a weekend row or season tile half needs for one day. */
export interface DayView {
  date: IsoDate;
  weekday: "Sat" | "Sun";
  daysOut: number;
  /**
   * past: before today, not logged. logged: a ski_log row exists.
   * preseason: before the first ski day (or after the last), so the dog gets the day.
   * forecast: 0 to 7 days out with a stored forecast; call comes from choose().
   * outlook: beyond forecast range, chances come from the season simulation.
   */
  status: "past" | "logged" | "preseason" | "forecast" | "outlook";
  tag: DayTag;
  call: Call | null;
  /** Extra sentence shown with the call, e.g. "Before your first ski day" or the Baker-penalty note. */
  note: string | null;
  logged: HillId | null;
  hills: Record<HillId, HillDayView>;
  chances: CallChances | null;
  /** Set only when one call has a chance of 50% or more. */
  likely: Call | null;
  expectedLeftAfter: DaysLeft | null;
  loggable: Loggable;
}

export interface WeekendView {
  saturday: IsoDate;
  days: DayView[];
  worthWatching: boolean;
}

export interface ReplayCall {
  call: Call;
  scores: Record<HillId, DayScore | null>;
  bars: Record<HillId, number | null>;
}

export interface ReplayDay {
  date: IsoDate;
  weekday: "Sat" | "Sun";
  open: Record<HillId, boolean>;
  friday: ReplayCall;
  wednesday: ReplayCall;
  changed: boolean;
  actual: Record<HillId, DayScore>;
  leftBefore: DaysLeft;
  leftAfter: DaysLeft;
  /** Points the Friday call earned on actual weather. */
  value: number;
  /** Set when the chosen hill's Friday forecast missed actual by 25 or more. */
  miss: { hill: HillId; forecast: number; actual: number; reason: string } | null;
}

export type StrategyKey = "friday" | "wednesday" | "simple" | "alwaysDog" | "hindsight";

export interface StrategyResult {
  key: StrategyKey;
  points: number;
  /** (points - alwaysDog) / (hindsight - alwaysDog), null in the no-gain case. */
  share: number | null;
  /** points / hindsight. */
  pctOfHindsight: number;
}

export interface Scorecard {
  strategies: Record<StrategyKey, StrategyResult>;
  noGain: boolean;
  /** Planner on actuals-as-forecast minus the Friday planner. */
  forecastErrorCost: number;
  daysSpent: { date: IsoDate; call: HillId }[];
  replayDays: number;
}
