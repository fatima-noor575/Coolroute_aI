import type { LngLat } from "@/types/route.types";

const EARTH_RADIUS_M = 6371000;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Great-circle distance between two [lng, lat] points, in meters. */
export function haversine(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const la1 = toRad(a[1]);
  const la2 = toRad(b[1]);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(x));
}

/** Compass bearing (0=N, 90=E, 180=S, 270=W) from point a to point b. */
export function bearingBetween(a: LngLat, b: LngLat): number {
  const la1 = toRad(a[1]);
  const la2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Destination point given a start, a compass bearing (deg), and a distance (m). */
export function destinationPoint(start: LngLat, bearingDeg: number, distanceM: number): LngLat {
  const δ = distanceM / EARTH_RADIUS_M;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(start[1]);
  const λ1 = toRad(start[0]);

  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(θ) * Math.sin(δ) * Math.cos(φ1);
  const x = Math.cos(δ) - Math.sin(φ1) * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);

  return [((toDeg(λ2) + 540) % 360) - 180, toDeg(φ2)];
}

export function midpoint(a: LngLat, b: LngLat): LngLat {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

/**
 * Ray-casting point-in-polygon test. `ring` is a closed or open list of
 * [lng, lat] vertices. Good enough locally (city-block scale) without
 * needing a full spherical-geometry library.
 */
export function pointInPolygon(point: LngLat, ring: LngLat[]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersects = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Approximate min distance (m) from a point to a polygon's edges. */
export function distanceToPolygon(point: LngLat, ring: LngLat[]): number {
  let min = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    min = Math.min(min, distanceToSegment(point, a, b));
  }
  return min;
}

function distanceToSegment(p: LngLat, a: LngLat, b: LngLat): number {
  // Work in a local equirectangular projection (meters) so segment math stays linear.
  const lat0 = toRad(p[1]);
  const proj = (pt: LngLat): [number, number] => [
    toRad(pt[0] - p[0]) * Math.cos(lat0) * EARTH_RADIUS_M,
    toRad(pt[1] - p[1]) * EARTH_RADIUS_M,
  ];
  const [ax, ay] = proj(a);
  const [bx, by] = proj(b);
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : (-ax * dx - ay * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(cx, cy);
}

export interface LngLatBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export function boundsOf(points: LngLat[], paddingM = 0): LngLatBounds {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }
  if (paddingM > 0) {
    const midLat = (minLat + maxLat) / 2;
    const dLat = paddingM / 111320;
    const dLng = paddingM / (111320 * Math.max(0.15, Math.cos(toRad(midLat))));
    minLng -= dLng;
    maxLng += dLng;
    minLat -= dLat;
    maxLat += dLat;
  }
  return { minLng, minLat, maxLng, maxLat };
}

export function mergeBounds(bounds: LngLatBounds[]): LngLatBounds {
  return bounds.reduce((acc, b) => ({
    minLng: Math.min(acc.minLng, b.minLng),
    minLat: Math.min(acc.minLat, b.minLat),
    maxLng: Math.max(acc.maxLng, b.maxLng),
    maxLat: Math.max(acc.maxLat, b.maxLat),
  }));
}
