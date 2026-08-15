import type { PlaceOption } from "@/types/route.types";

export const APP_NAME = "CoolRoute AI";

/**
 * These only seed the "Recent" list shown before the user types anything,
 * plus the app's initial origin/destination. Actual search results come
 * from the live global geocoder (see src/services/geocoding.ts), which
 * covers every city and country worldwide — not just these.
 */
export const PLACES: PlaceOption[] = [
  {
    id: "p1",
    name: "Washington Square Park",
    detail: "New York, United States",
    coords: [-73.9973, 40.7308],
  },
  {
    id: "p2",
    name: "Union Square",
    detail: "New York, United States",
    coords: [-73.9903, 40.7359],
  },
  { id: "p3", name: "Bryant Park", detail: "New York, United States", coords: [-73.9832, 40.7536] },
  {
    id: "p4",
    name: "Grand Central Terminal",
    detail: "New York, United States",
    coords: [-73.9772, 40.7527],
  },
  { id: "p5", name: "Hyde Park", detail: "London, United Kingdom", coords: [-0.1657, 51.5073] },
  { id: "p6", name: "Shibuya Crossing", detail: "Tokyo, Japan", coords: [139.7016, 35.6595] },
  { id: "p7", name: "Marina Bay Sands", detail: "Singapore", coords: [103.8607, 1.2834] },
  {
    id: "p8",
    name: "Federation Square",
    detail: "Melbourne, Australia",
    coords: [144.9691, -37.8179],
  },
  { id: "p9", name: "Zócalo", detail: "Mexico City, Mexico", coords: [-99.1332, 19.4326] },
  { id: "p10", name: "Marrakech Medina", detail: "Marrakech, Morocco", coords: [-7.9811, 31.6295] },
];

export const RECENT_PLACE_IDS = ["p1", "p3", "p8"];

export const DEFAULT_ORIGIN = PLACES[0]!;
export const DEFAULT_DESTINATION = PLACES[3]!;
