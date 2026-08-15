import type { LngLat } from "@/types/route.types";
import type { LngLatBounds } from "@/utils/geo";
import { RoutingError } from "@/services/osrm";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];
const REQUEST_TIMEOUT_MS = 20000;

export interface BuildingFeature {
  ring: LngLat[];
  heightM: number;
}

export interface TreeFeature {
  center: LngLat;
  canopyRadiusM: number;
  heightM: number;
}

export interface CanopyAreaFeature {
  ring: LngLat[];
  heightM: number;
}

export interface CrossingFeature {
  location: LngLat;
  type: "crosswalk" | "underpass" | "bridge";
}

export interface ShadeFeatureCollection {
  buildings: BuildingFeature[];
  trees: TreeFeature[];
  canopyAreas: CanopyAreaFeature[];
  crossings: CrossingFeature[];
}

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
  members?: {
    type: string;
    ref: number;
    role: string;
    geometry?: { lat: number; lon: number }[];
  }[];
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function estimateBuildingHeight(tags: Record<string, string>): number {
  const heightTag = tags["height"] ?? tags["building:height"];
  if (heightTag) {
    const parsed = parseFloat(heightTag);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  const levelsTag = tags["building:levels"];
  if (levelsTag) {
    const levels = parseFloat(levelsTag);
    if (!Number.isNaN(levels) && levels > 0) return levels * 3.2;
  }
  return 9; // default: ~3-storey building
}

function estimateTreeHeight(tags: Record<string, string>): number {
  const heightTag = tags["height"];
  if (heightTag) {
    const parsed = parseFloat(heightTag);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 8; // default mature street-tree height
}

function ringFromGeometry(geometry?: { lat: number; lon: number }[]): LngLat[] | null {
  if (!geometry || geometry.length < 3) return null;
  return geometry.map((g) => [g.lon, g.lat] as LngLat);
}

function buildQuery(bounds: LngLatBounds): string {
  const bbox = `${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng}`;
  return `
    [out:json][timeout:22];
    (
      way["building"](${bbox});
      node["natural"="tree"](${bbox});
      way["natural"="wood"](${bbox});
      way["landuse"="forest"](${bbox});
      node["highway"="crossing"](${bbox});
      way["highway"="footway"]["tunnel"="yes"](${bbox});
      way["bridge"="yes"]["highway"](${bbox});
    );
    out geom;
  `.trim();
}

async function postOverpass(
  query: string,
  endpoint: string,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener("abort", onOuterAbort);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (res.status === 429 || res.status === 504) {
      throw new RoutingError("RATE_LIMITED", "The shade-data service is busy. Retrying may help.");
    }
    if (!res.ok) {
      throw new RoutingError("NETWORK_ERROR", `Shade-data service returned HTTP ${res.status}.`);
    }
    return (await res.json()) as OverpassResponse;
  } catch (err) {
    if (err instanceof RoutingError) throw err;
    if ((err as Error).name === "AbortError") {
      throw new RoutingError(
        signal?.aborted ? "NETWORK_ERROR" : "TIMEOUT",
        "The shade-data service took too long to respond.",
      );
    }
    throw new RoutingError("NETWORK_ERROR", "Couldn't reach the shade-data service.");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

/**
 * Pulls real building footprints, tree canopy, and pedestrian
 * crossings/underpasses/bridges from OpenStreetMap (via Overpass) for a
 * bounding box around the route. Tries a couple of public mirrors before
 * giving up, since Overpass instances are frequently rate-limited.
 */
export async function fetchShadeFeatures(
  bounds: LngLatBounds,
  signal?: AbortSignal,
): Promise<ShadeFeatureCollection> {
  const query = buildQuery(bounds);
  let lastError: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const json = await postOverpass(query, endpoint, signal);
      return parseElements(json.elements);
    } catch (err) {
      lastError = err;
      if (err instanceof RoutingError && err.code === "TIMEOUT" && signal?.aborted) throw err;
      // try next mirror
    }
  }
  throw lastError instanceof RoutingError
    ? lastError
    : new RoutingError("NETWORK_ERROR", "Couldn't reach any shade-data service.");
}

function parseElements(elements: OverpassElement[]): ShadeFeatureCollection {
  const buildings: BuildingFeature[] = [];
  const trees: TreeFeature[] = [];
  const canopyAreas: CanopyAreaFeature[] = [];
  const crossings: CrossingFeature[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};

    if (el.type === "node" && tags["natural"] === "tree") {
      if (el.lat != null && el.lon != null) {
        trees.push({
          center: [el.lon, el.lat],
          canopyRadiusM: tags["diameter_crown"] ? parseFloat(tags["diameter_crown"]) / 2 : 4,
          heightM: estimateTreeHeight(tags),
        });
      }
      continue;
    }

    if (el.type === "node" && tags["highway"] === "crossing") {
      if (el.lat != null && el.lon != null) {
        crossings.push({ location: [el.lon, el.lat], type: "crosswalk" });
      }
      continue;
    }

    if (el.type === "way" && tags["building"]) {
      const ring = ringFromGeometry(el.geometry);
      if (ring) buildings.push({ ring, heightM: estimateBuildingHeight(tags) });
      continue;
    }

    if (el.type === "way" && (tags["natural"] === "wood" || tags["landuse"] === "forest")) {
      const ring = ringFromGeometry(el.geometry);
      if (ring) canopyAreas.push({ ring, heightM: 10 });
      continue;
    }

    if (el.type === "way" && tags["highway"] === "footway" && tags["tunnel"] === "yes") {
      const mid = el.geometry?.[Math.floor((el.geometry.length - 1) / 2)];
      if (mid) crossings.push({ location: [mid.lon, mid.lat], type: "underpass" });
      continue;
    }

    if (el.type === "way" && tags["bridge"] === "yes" && tags["highway"]) {
      const mid = el.geometry?.[Math.floor((el.geometry.length - 1) / 2)];
      if (mid) crossings.push({ location: [mid.lon, mid.lat], type: "bridge" });
      continue;
    }
  }

  return { buildings, trees, canopyAreas, crossings };
}
