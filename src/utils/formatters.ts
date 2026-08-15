export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

export function formatClock(minutesOfDay: number): string {
  const h = Math.floor(minutesOfDay / 60);
  const m = Math.floor(minutesOfDay % 60);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDistance(meters: number, imperial = false): string {
  if (imperial) return `${(meters / 1609.34).toFixed(2)} mi`;
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}
