import type { LngLat } from "@/types/route.types";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/foot";
const REQUEST_TIMEOUT_MS = 12000;

export type RoutingErrorCode =
  "TIMEOUT" | "NO_ROUTE" | "RATE_LIMITED" | "NETWORK_ERROR" | "INVALID_RESPONSE" | "UNKNOWN";

export class RoutingError extends Error {
  code: RoutingErrorCode;
  constructor(code: RoutingErrorCode, message: string) {
    super(message);
    this.name = "RoutingError";
    this.code = code;
  }
}

export interface OsrmLeg {
  coordinates: LngLat[];
  distance: number; // meters
  duration: number; // seconds
}

interface OsrmRouteJson {
  code: string;
  message?: string;
  routes?: {
    geometry: { type: "LineString"; coordinates: LngLat[] };
    distance: number;
    duration: number;
  }[];
}

async function fetchWithTimeout(url: string, signal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener("abort", onOuterAbort);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      if (signal?.aborted) throw new RoutingError("NETWORK_ERROR", "Request cancelled.");
      throw new RoutingError("TIMEOUT", "The routing service took too long to respond.");
    }
    throw new RoutingError(
      "NETWORK_ERROR",
      "Couldn't reach the routing service. Check your connection.",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

/**
 * Fetches a real walking route (or routes, if OSRM returns alternatives)
 * following actual streets/sidewalks between an ordered list of
 * waypoints, via OSRM's free public foot-routing endpoint.
 */
export async function fetchOsrmRoutes(
  waypoints: LngLat[],
  opts: { alternatives?: boolean; signal?: AbortSignal | undefined } = {},
): Promise<OsrmLeg[]> {
  const coordsParam = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_BASE}/${coordsParam}?geometries=geojson&overview=full&alternatives=${
    opts.alternatives ? "true" : "false"
  }&steps=false`;

  const res = await fetchWithTimeout(url, opts.signal);

  if (res.status === 429) {
    throw new RoutingError(
      "RATE_LIMITED",
      "The routing service is rate-limiting requests. Please wait a moment and try again.",
    );
  }
  if (!res.ok && res.status !== 400) {
    throw new RoutingError(
      "NETWORK_ERROR",
      `Routing service returned an error (HTTP ${res.status}).`,
    );
  }

  let json: OsrmRouteJson;
  try {
    json = (await res.json()) as OsrmRouteJson;
  } catch {
    throw new RoutingError(
      "INVALID_RESPONSE",
      "The routing service returned an unreadable response.",
    );
  }

  if (json.code === "NoRoute" || json.code === "NoSegment") {
    throw new RoutingError("NO_ROUTE", "No walking route could be found between those points.");
  }
  if (json.code !== "Ok" || !json.routes || json.routes.length === 0) {
    throw new RoutingError(
      "NO_ROUTE",
      json.message || "No walking route could be found between those points.",
    );
  }

  return json.routes.map((r) => ({
    coordinates: r.geometry.coordinates,
    distance: r.distance,
    duration: r.duration,
  }));
}
