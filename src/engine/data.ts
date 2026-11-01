import actualBaker from "../../data/actual-baker.json";
import actualWhistler from "../../data/actual-whistler.json";
import wedBaker from "../../data/forecast-2025-26-baker.json";
import friBaker from "../../data/forecast-2025-26-baker-friday.json";
import wedWhistler from "../../data/forecast-2025-26-whistler.json";
import friWhistler from "../../data/forecast-2025-26-whistler-friday.json";
import type { HillId, WeatherByDate } from "./types";

/** Actual weather, Nov 1 to Apr 30, 2017-18 to 2025-26. */
export const ACTUALS: Record<HillId, WeatherByDate> = {
  whistler: actualWhistler as WeatherByDate,
  baker: actualBaker as WeatherByDate,
};

/** 2025-26 weekend days as forecast the Wednesday before. */
export const FORECAST_WED: Record<HillId, WeatherByDate> = {
  whistler: wedWhistler as WeatherByDate,
  baker: wedBaker as WeatherByDate,
};

/** 2025-26 weekend days as forecast the Friday before. */
export const FORECAST_FRI: Record<HillId, WeatherByDate> = {
  whistler: friWhistler as WeatherByDate,
  baker: friBaker as WeatherByDate,
};
