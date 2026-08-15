import type {
  LngLat,
  OptimizationMode,
  Route,
  RouteRequest,
  RouteResponse,
} from "@/types/route.types";
import { fetchOsrmRoutes, RoutingError, type OsrmLeg } from "@/services/osrm";
import { fetchShadeFeatures, type ShadeFeatureCollection } from "@/services/overpass";
import { analyzeRouteShade, crossingsAlongRoute } from "@/utils/shadeAnalysis";
import { boundsOf, bearingBetween, destinationPoint, haversine } from "@/utils/geo";
import { dateAtMinutes, getSunPosition } from "@/utils/sun";
import { fetchWeatherSnapshot } from "@/services/weather";

export { RoutingError } from "@/services/osrm";
export type { RoutingErrorCode } from "@/services/osrm";
export { SUNRISE_MINUTES, SUNSET_MINUTES } from "@/utils/sun";

const WALK_SPEED_MPS = 1.35; // used only as a fallback if OSRM duration is missing/zero

interface Candidate {
  leg: OsrmLeg;
  geometryKey: string;
}

function geometryKey(coords: LngLat[]): string {
  // Cheap dedupe signature: sample a handful of points along the path.
  const n = coords.length;
  if (n === 0) return "";
  const idxs = [0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1];
  return idxs.map((i) => coords[i]!.map((v) => v.toFixed(4)).join(",")).join("|");
}

/**
 * Builds an off-line-of-sight via-point so a second/third OSRM request is
 * forced through different real streets, instead of returning the same
 * geometry three times. OSRM still does all the actual street-following —
 * this only nudges *which* streets it's asked to connect.
 */
function perpendicularVia(
  origin: LngLat,
  destination: LngLat,
  fraction: number,
  side: 1 | -1,
): LngLat {
  const directBearing = bearingBetween(origin, destination);
  const distance = haversine(origin, destination);
  const along = destinationPoint(origin, directBearing, distance * fraction);
  const offsetM = Math.min(420, Math.max(50, distance * 0.14));
  return destinationPoint(along, (directBearing + 90 * side + 360) % 360, offsetM);
}

async function collectRouteCandidates(
  origin: LngLat,
  destination: LngLat,
  signal?: AbortSignal,
): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  const add = (leg: OsrmLeg) => {
    const key = geometryKey(leg.coordinates);
    if (seen.has(key)) return false;
    seen.add(key);
    candidates.push({ leg, geometryKey: key });
    return true;
  };

  // 1) Direct route, plus whatever alternatives OSRM is willing to offer.
  const direct = await fetchOsrmRoutes([origin, destination], { alternatives: true, signal });
  direct.forEach(add);

  // 2/3) If OSRM didn't hand us enough diversity, force real-street
  // diversity via off-axis waypoints so the "shade" vs "fastest" choice
  // is a genuine geometric trade-off rather than a coincidence.
  const viaAttempts: [number, 1 | -1][] = [
    [0.4, 1],
    [0.6, -1],
    [0.5, 1],
  ];
  for (const [fraction, side] of viaAttempts) {
    if (candidates.length >= 3) break;
    try {
      const via = perpendicularVia(origin, destination, fraction, side);
      const [routed] = await fetchOsrmRoutes([origin, via, destination], { signal });
      if (routed) add(routed);
    } catch {
      // A single via-point attempt failing is not fatal — we already have
      // the direct route; just skip this diversification attempt.
    }
  }

  if (candidates.length === 0) {
    throw new RoutingError("NO_ROUTE", "No walking route could be found between those points.");
  }
  return candidates.slice(0, 3);
}

const MODE_ORDER: OptimizationMode[] = ["shade", "balanced", "fastest"];
const MODE_NAMES: Record<OptimizationMode, string> = {
  shade: "Route A",
  balanced: "Route B",
  fastest: "Route C",
};
const MODE_BADGES: Record<OptimizationMode, string> = {
  shade: "Best Shade",
  balanced: "Balanced",
  fastest: "Fastest",
};

function buildRoute(
  id: string,
  mode: OptimizationMode,
  leg: OsrmLeg,
  features: ShadeFeatureCollection,
  sun: ReturnType<typeof getSunPosition>,
): Route {
  const analysis = analyzeRouteShade(leg.coordinates, sun, features);
  const distance = analysis.distance || leg.distance;
  const walkingTime = Math.max(1, Math.round((leg.duration || distance / WALK_SPEED_MPS) / 60));
  const directSunExposure = Math.round(walkingTime * (1 - analysis.shadeCoverage / 100));

  // Comfort blends measured shade coverage against walk length and current
  // solar elevation (higher sun = harsher exposure penalty) — all inputs
  // are now real, computed values rather than random noise.
  const heatPenalty = Math.max(0, sun.elevationDeg) * 0.22;
  const comfortScore = Math.max(
    5,
    Math.min(
      99,
      Math.round(analysis.shadeCoverage * 0.7 + Math.max(0, 40 - walkingTime) * 0.3 - heatPenalty),
    ),
  );

  const crossingPoints = crossingsAlongRoute(leg.coordinates, features.crossings);

  // No ground-truth "which side of the street" signal from OSRM/OSM here,
  // so this stays a light heuristic off the route's dominant bearing
  // rather than a random pick.
  const startBearing = bearingBetween(
    leg.coordinates[0]!,
    leg.coordinates[leg.coordinates.length - 1]!,
  );
  const streetSide: Route["properties"]["streetSide"] =
    startBearing < 180 ? "right" : startBearing < 360 ? "left" : "mixed";

  return {
    id,
    name: MODE_NAMES[mode],
    geometry: { type: "LineString", coordinates: leg.coordinates },
    properties: {
      walkingTime,
      distance: Math.round(distance),
      shadeCoverage: analysis.shadeCoverage,
      directSunExposure,
      comfortScore,
      segments: analysis.segments,
      crossingPoints,
      streetSide,
      badge: MODE_BADGES[mode],
      mode,
    },
  };
}

export async function fetchRoutes(req: RouteRequest, signal?: AbortSignal): Promise<RouteResponse> {
  const origin = req.origin.coords;
  const destination = req.destination.coords;
  const when = dateAtMinutes(req.date, req.minutes);

  const candidates = await collectRouteCandidates(origin, destination, signal);

  const allCoords = candidates.flatMap((c) => c.leg.coordinates);
  const bounds = boundsOf(allCoords.length ? allCoords : [origin, destination], 120);

  let features: ShadeFeatureCollection;
  try {
    features = await fetchShadeFeatures(bounds, signal);
  } catch (err) {
    // Shade/crossing data is an enhancement layer on top of real routing —
    // if OSM's Overpass service is unreachable or rate-limited we still
    // return real streets from OSRM, just without shade scoring, rather
    // than failing the whole request.
    console.warn("Shade-data lookup failed; continuing with unscored routes.", err);
    features = { buildings: [], trees: [], canopyAreas: [], crossings: [] };
  }

  const sunAtDeparture = getSunPosition(when, origin[1], origin[0]);

  // Score every real candidate, then assign shade/balanced/fastest labels
  // by actual measured outcome instead of pre-deciding which is which.
  const scored = candidates.map((c, i) => ({
    candidate: c,
    route: buildRoute(`route-${i}`, "balanced", c.leg, features, sunAtDeparture),
  }));

  const byShade = [...scored].sort(
    (a, b) => b.route.properties.shadeCoverage - a.route.properties.shadeCoverage,
  );
  const byTime = [...scored].sort(
    (a, b) => a.route.properties.walkingTime - b.route.properties.walkingTime,
  );

  const assigned = new Map<string, OptimizationMode>();
  const shadePick = byShade[0]!;
  assigned.set(shadePick.route.id, "shade");
  const fastestPick = byTime.find((s) => !assigned.has(s.route.id)) ?? byTime[0]!;
  assigned.set(fastestPick.route.id, "fastest");
  for (const s of scored) {
    if (!assigned.has(s.route.id)) assigned.set(s.route.id, "balanced");
  }

  const routes: Route[] = scored.map(({ candidate, route }) => {
    const mode = assigned.get(route.id) ?? "balanced";
    return buildRoute(route.id, mode, candidate.leg, features, sunAtDeparture);
  });

  routes.sort(
    (a, b) => MODE_ORDER.indexOf(a.properties.mode) - MODE_ORDER.indexOf(b.properties.mode),
  );

  const preferred = routes.find((r) => r.properties.mode === req.mode);
  const recommended = preferred?.id ?? routes[0]!.id;

  const weather = await fetchWeatherSnapshot(when, origin[1], origin[0], signal).catch(() => null);
  const cloudCover = weather
    ? Math.round(weather.cloudCoverPct)
    : estimateCloudCoverPlaceholder(bounds);
  const heatIndex = weather
    ? Math.round(weather.temperatureC)
    : Math.round(24 + Math.max(0, sunAtDeparture.elevationDeg) * 0.18);

  return {
    routes,
    recommended,
    summary: {
      uvIndex: estimateUvIndex(sunAtDeparture.elevationDeg, cloudCover),
      heatIndex,
      cloudCover,
      sunAzimuth: Math.round(sunAtDeparture.azimuthDeg),
      sunElevation: Math.round(sunAtDeparture.elevationDeg),
    },
  };
}

/**
 * UV index estimated from real solar elevation (the dominant physical
 * driver of ground-level UV) using the standard approximation that UVI
 * scales with sin(elevation), attenuated by an (unverified) cloud-cover
 * estimate — see the note on estimateCloudCoverPlaceholder below.
 */
function estimateUvIndex(elevationDeg: number, cloudCoverPct: number): number {
  if (elevationDeg <= 0) return 0;
  const clearSkyMax = 12;
  const elevationFactor = Math.sin((elevationDeg * Math.PI) / 180);
  const cloudAttenuation = 1 - (cloudCoverPct / 100) * 0.5;
  return Math.max(0, Math.min(11, Math.round(clearSkyMax * elevationFactor * cloudAttenuation)));
}

/**
 * NOTE: no free, key-free live weather/cloud-cover API is wired in here.
 * This is a deterministic (not random) placeholder derived from location
 * so repeated queries for the same place are at least stable — it is
 * NOT real meteorological data. Wire in a real weather API (e.g.
 * Open-Meteo, which is free and key-free) here to make cloudCover (and
 * therefore heatIndex/uvIndex's cloud term) fully real.
 */
function estimateCloudCoverPlaceholder(bounds: { minLat: number; minLng: number }): number {
  const seed = Math.abs(Math.round((bounds.minLat * 1000 + bounds.minLng * 1000) % 40));
  return 10 + seed;
}
