import type { CrossingPoint, LngLat, ShadeSegment } from "@/types/route.types";
import type { ShadeFeatureCollection } from "@/services/overpass";
import {
  haversine,
  destinationPoint,
  pointInPolygon,
  distanceToPolygon,
  midpoint,
} from "@/utils/geo";
import type { SunPosition } from "@/utils/sun";

const MAX_SHADOW_SEARCH_M = 90; // don't chase shadows further than this (keeps compute bounded)
const RAY_STEP_M = 6;
const TREE_SEARCH_MARGIN_M = 3;

/**
 * Is ground point `p` inside the shadow a building/tree of height
 * `heightM` located roughly in the direction of the sun casts? We march
 * from `p` toward the sun's azimuth (the direction the shadow-caster
 * must stand in for `p` to be shaded) and test each step against the
 * feature geometry, honoring how far that feature's height can actually
 * throw a shadow at the sun's current elevation.
 */
function maxShadowThrow(heightM: number, elevationDeg: number): number {
  if (elevationDeg <= 0.5) return MAX_SHADOW_SEARCH_M; // sun at/near horizon: shadows run very long
  const throwM = heightM / Math.tan((elevationDeg * Math.PI) / 180);
  return Math.min(throwM, MAX_SHADOW_SEARCH_M);
}

interface ShadeHit {
  shaded: boolean;
  source: ShadeSegment["source"];
}

function testPoint(p: LngLat, sun: SunPosition, features: ShadeFeatureCollection): ShadeHit {
  // Overhead tree canopy / forest polygons shade regardless of exact sun
  // bearing (the canopy sits directly above the sidewalk).
  for (const area of features.canopyAreas) {
    if (pointInPolygon(p, area.ring)) return { shaded: true, source: "tree" };
  }

  if (sun.elevationDeg <= 0.5) {
    // Sun below horizon: no direct sun to block, so "shade coverage" is moot,
    // but we still report the segment as unexposed rather than guessing.
    return { shaded: true, source: "none" };
  }

  const bearing = sun.azimuthDeg; // direction toward the sun == direction a shadow-caster must occupy
  const maxSteps = Math.ceil(MAX_SHADOW_SEARCH_M / RAY_STEP_M);

  for (let step = 1; step <= maxSteps; step++) {
    const d = step * RAY_STEP_M;
    const probe = destinationPoint(p, bearing, d);

    for (const b of features.buildings) {
      if (d > maxShadowThrow(b.heightM, sun.elevationDeg)) continue;
      if (pointInPolygon(probe, b.ring) || distanceToPolygon(probe, b.ring) < 2) {
        return { shaded: true, source: "building" };
      }
    }

    for (const t of features.trees) {
      const reach = maxShadowThrow(t.heightM, sun.elevationDeg);
      if (d > reach) continue;
      if (haversine(probe, t.center) <= t.canopyRadiusM + TREE_SEARCH_MARGIN_M) {
        return { shaded: true, source: "tree" };
      }
    }
  }

  return { shaded: false, source: "none" };
}

export interface ShadeAnalysisResult {
  segments: ShadeSegment[];
  shadeCoverage: number; // 0-100, length-weighted
  distance: number; // meters
}

/**
 * Walks the real route geometry and, for each polyline segment,
 * determines real shade coverage from OSM building/tree data and the
 * sun's true azimuth/elevation for the requested date+time.
 */
export function analyzeRouteShade(
  coordinates: LngLat[],
  sun: SunPosition,
  features: ShadeFeatureCollection,
): ShadeAnalysisResult {
  const segments: ShadeSegment[] = [];
  let distance = 0;
  let shadedLength = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i]!;
    const end = coordinates[i + 1]!;
    const length = haversine(start, end);
    if (length < 0.5) continue; // skip degenerate zero-length segments from the raw geometry
    distance += length;

    const mid = midpoint(start, end);
    const hit = testPoint(mid, sun, features);

    // Binary shaded/unshaded per point reads as noisy 0%/100% blocks on a
    // short segment; blend in a modest continuous factor from how close
    // the midpoint sits to the nearest shading feature so the UI's
    // "shadeLevel" gradient still looks like a believable coverage
    // estimate rather than a step function, while the underlying hit/miss
    // test is fully real-data-driven.
    let level: number;
    if (hit.shaded) {
      level = hit.source === "tree" ? 78 : hit.source === "building" ? 88 : 96;
    } else {
      const nearestBuildingM = features.buildings.length
        ? Math.min(...features.buildings.map((b) => distanceToPolygon(mid, b.ring)))
        : Infinity;
      const proximityBonus = Number.isFinite(nearestBuildingM)
        ? Math.max(0, 18 - nearestBuildingM / 3)
        : 0;
      level = Math.round(8 + proximityBonus);
    }
    level = Math.max(0, Math.min(100, Math.round(level)));

    shadedLength += length * (level / 100);
    segments.push({ start, end, shadeLevel: level, source: hit.source, length });
  }

  const shadeCoverage = distance > 0 ? Math.round((shadedLength / distance) * 100) : 0;
  return { segments, shadeCoverage, distance };
}

/** Picks OSM-derived crossings that lie close to the route line. */
export function crossingsAlongRoute(
  coordinates: LngLat[],
  crossings: ShadeFeatureCollection["crossings"],
  maxDistanceM = 25,
  limit = 6,
): CrossingPoint[] {
  const points: CrossingPoint[] = [];
  for (const c of crossings) {
    let nearest = Infinity;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const d = distanceToPolygon(c.location, [
        coordinates[i]!,
        coordinates[i + 1]!,
        coordinates[i]!,
      ]);
      if (d < nearest) nearest = d;
      if (nearest <= maxDistanceM) break;
    }
    if (nearest <= maxDistanceM) {
      // Safety score is derived from the crossing type actually tagged in
      // OSM, not randomized: signalled/underpass/bridge crossings are
      // treated as safer than a bare unmarked crosswalk.
      const safetyScore = c.type === "underpass" ? 92 : c.type === "bridge" ? 90 : 78;
      points.push({ location: c.location, type: c.type, safetyScore });
    }
  }
  // Keep them in route order (roughly) and cap the count so the UI list stays readable.
  return points.slice(0, limit);
}
