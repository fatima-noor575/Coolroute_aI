import type { PlaceOption } from "@/types/route.types";

/**
 * Global place search backed by Photon (https://photon.komoot.io), a free,
 * key-less geocoder built on OpenStreetMap data. It covers every country and
 * city worldwide, unlike the old hardcoded NYC-only mock list.
 *
 * Falls back to Nominatim (also OSM-based) if Photon is unreachable, so
 * search keeps working even if one provider is down or blocked.
 */

const PHOTON_URL = "https://photon.komoot.io/api/";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    osm_id?: number;
    osm_type?: string;
    type?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

function buildDetail(p: PhotonFeature["properties"]): string {
  const locality = p.city ?? p.town ?? p.village ?? p.state;
  return [locality, p.country].filter(Boolean).join(", ") || "Unknown location";
}

function fromPhoton(json: PhotonResponse): PlaceOption[] {
  return json.features
    .filter((f) => f.properties.name)
    .map((f) => ({
      id: `${f.properties.osm_type ?? "osm"}-${f.properties.osm_id ?? Math.random()}`,
      name: f.properties.name!,
      detail: buildDetail(f.properties),
      coords: [f.geometry.coordinates[0], f.geometry.coordinates[1]],
    }));
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  name?: string;
  address?: Record<string, string>;
}

function fromNominatim(json: NominatimResult[]): PlaceOption[] {
  return json.map((r) => {
    const addr = r.address ?? {};
    const locality = addr["city"] ?? addr["town"] ?? addr["village"] ?? addr["state"];
    const detail = [locality, addr["country"]].filter(Boolean).join(", ") || r.display_name;
    return {
      id: `nominatim-${r.place_id}`,
      name: r.name || r.display_name.split(",")[0]!.trim(),
      detail,
      coords: [parseFloat(r.lon), parseFloat(r.lat)] as [number, number],
    };
  });
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceOption[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}&limit=7&lang=en`;
    const res = await fetch(url, buildInit(signal));
    if (!res.ok) throw new Error(`Photon ${res.status}`);
    const json = (await res.json()) as PhotonResponse;
    const results = fromPhoton(json);
    if (results.length) return results;
    throw new Error("no photon results");
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    // Fall back to Nominatim so a single provider hiccup doesn't kill search.
    try {
      const url = `${NOMINATIM_URL}?q=${encodeURIComponent(q)}&format=jsonv2&addressdetails=1&limit=7`;
      const res = await fetch(url, buildInit(signal, { Accept: "application/json" }));
      if (!res.ok) return [];
      const json = (await res.json()) as NominatimResult[];
      return fromNominatim(json);
    } catch {
      return [];
    }
  }
}

function buildInit(signal?: AbortSignal, headers?: Record<string, string>): RequestInit {
  const init: RequestInit = {};
  if (signal) init.signal = signal;
  if (headers) init.headers = headers;
  return init;
}

export async function reverseGeocode(
  lng: number,
  lat: number,
  signal?: AbortSignal,
): Promise<PlaceOption | null> {
  try {
    const url = `${PHOTON_URL}reverse?lon=${lng}&lat=${lat}`;
    const res = await fetch(url, buildInit(signal));
    if (!res.ok) throw new Error("reverse failed");
    const json = (await res.json()) as PhotonResponse;
    const [first] = fromPhoton(json);
    return first ?? null;
  } catch {
    return null;
  }
}
