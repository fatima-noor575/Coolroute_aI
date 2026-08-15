const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const REQUEST_TIMEOUT_MS = 8000;
const FORECAST_HORIZON_DAYS = 15;

export interface WeatherSnapshot {
  cloudCoverPct: number;
  temperatureC: number;
}

interface HourlyPayload {
  hourly?: {
    time: string[];
    cloud_cover?: number[];
    temperature_2m?: number[];
  };
}

function nearestHourIndex(times: string[], target: Date): number {
  let bestIdx = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]!).getTime() - target.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Real cloud cover + temperature for a location/date via Open-Meteo,
 * which is free and requires no API key. Uses the forecast endpoint for
 * dates within its ~15-day horizon and the historical archive endpoint
 * for past dates; returns null (rather than throwing) for far-future
 * dates or on any failure, so callers can fall back gracefully — weather
 * is a secondary enhancement layer, not something that should block a
 * route result.
 */
export async function fetchWeatherSnapshot(
  date: Date,
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<WeatherSnapshot | null> {
  const now = new Date();
  const daysOut = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isFuture = daysOut >= 0;
  if (isFuture && daysOut > FORECAST_HORIZON_DAYS) return null;

  const dateStr = date.toISOString().slice(0, 10);
  const base = isFuture ? FORECAST_URL : ARCHIVE_URL;
  const url =
    `${base}?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,cloud_cover` +
    `&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener("abort", onOuterAbort);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as HourlyPayload;
    const times = json.hourly?.time;
    if (!times || times.length === 0) return null;
    const idx = nearestHourIndex(times, date);
    const cloudCoverPct = json.hourly?.cloud_cover?.[idx];
    const temperatureC = json.hourly?.temperature_2m?.[idx];
    if (cloudCoverPct == null || temperatureC == null) return null;
    return { cloudCoverPct, temperatureC };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}
