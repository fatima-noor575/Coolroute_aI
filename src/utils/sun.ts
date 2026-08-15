import { getPosition, getTimes } from "suncalc";
import { DEFAULT_ORIGIN } from "@/constants/mockData";

export interface SunPosition {
  /** Compass bearing to the sun: 0=N, 90=E, 180=S, 270=W. */
  azimuthDeg: number;
  /** Degrees above the horizon. Negative = sun is below the horizon. */
  elevationDeg: number;
}

/**
 * Real sun position for a given date/time and location, using the
 * suncalc library (NOAA-derived solar position algorithm) instead of a
 * random number. This suncalc build already returns degrees with a
 * north-based compass azimuth (0=N, 90=E, 180=S, 270=W), so no unit
 * conversion is needed.
 */
export function getSunPosition(date: Date, lat: number, lng: number): SunPosition {
  const pos = getPosition(date, lat, lng);
  return { azimuthDeg: pos.azimuth, elevationDeg: pos.altitude };
}

/** Builds a Date at local wall-clock `minutes` (from midnight) on the given day. */
export function dateAtMinutes(day: Date, minutes: number): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}

function minutesOf(date: Date | undefined): number | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * Real sunrise/sunset (in minutes-from-midnight) for a location/date,
 * replacing the previously hardcoded constants. Falls back to a sane
 * default if the location has no sunrise/sunset that day (polar
 * day/night) or suncalc otherwise fails.
 */
export function getSunriseSunsetMinutes(
  date: Date,
  lat: number,
  lng: number,
): { sunrise: number; sunset: number } {
  try {
    const times = getTimes(date, lat, lng);
    const sunrise = minutesOf(times.sunrise ?? undefined);
    const sunset = minutesOf(times.sunset ?? undefined);
    if (sunrise !== null && sunset !== null) return { sunrise, sunset };
  } catch {
    // fall through to default below
  }
  return { sunrise: 6 * 60 + 12, sunset: 19 * 60 + 48 };
}

// Live-computed defaults (today, at the app's default origin) so the
// planner's sunrise/sunset readout reflects a real solar calculation
// instead of a hardcoded fake value, without requiring every caller to
// thread location through as a prop.
const DEFAULT_TODAY = getSunriseSunsetMinutes(
  new Date(),
  DEFAULT_ORIGIN.coords[1],
  DEFAULT_ORIGIN.coords[0],
);

export const SUNRISE_MINUTES = DEFAULT_TODAY.sunrise;
export const SUNSET_MINUTES = DEFAULT_TODAY.sunset;
