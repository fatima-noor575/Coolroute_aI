export const SHADE_STOPS: { max: number; color: string; label: string }[] = [
  { max: 10, color: "#FF4B3E", label: "Direct sun" },
  { max: 30, color: "#FF8C00", label: "Minimal shade" },
  { max: 50, color: "#FFD23F", label: "Limited shade" },
  { max: 70, color: "#5AC8FF", label: "Partial shade" },
  { max: 101, color: "#0A5BFF", label: "Full shade" },
];

export function shadeColor(level: number): string {
  return (SHADE_STOPS.find((s) => level < s.max) ?? SHADE_STOPS[4]!).color;
}

export function shadeLabel(level: number): string {
  return (SHADE_STOPS.find((s) => level < s.max) ?? SHADE_STOPS[4]!).label;
}

export const MAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
