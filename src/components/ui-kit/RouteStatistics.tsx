import { Counter } from "@/components/animations/CounterAnimation";
import { shadeColor } from "@/constants/colors";
import type { Route, RouteSummary } from "@/types/route.types";
import { formatDistance } from "@/utils/formatters";

function Ring({ value, color, label }: { value: number; color: string; label: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative h-[84px] w-[84px]">
        <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
          <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
          <circle
            cx="42"
            cy="42"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * value) / 100}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <Counter value={value} suffix="%" className="metric text-lg font-semibold" />
        </div>
      </div>
      <span className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">{label}</span>
    </div>
  );
}

export function RouteStatistics({ route, summary, imperial }: { route: Route; summary: RouteSummary; imperial: boolean }) {
  const p = route.properties;
  const total = p.segments.reduce((a, s) => a + s.length, 0) || 1;
  const bucket = (min: number, max: number) =>
    Math.round(
      (p.segments.filter((s) => s.shadeLevel >= min && s.shadeLevel < max).reduce((a, s) => a + s.length, 0) / total) *
        100,
    );
  const breakdown = [
    { label: "Full shade", value: bucket(70, 101), color: "#0A5BFF" },
    { label: "Partial shade", value: bucket(40, 70), color: "#5AC8FF" },
    { label: "Sun exposed", value: bucket(0, 40), color: "#FF8C00" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-around">
        <Ring value={p.shadeCoverage} color={shadeColor(p.shadeCoverage)} label="Shade" />
        <Ring value={p.comfortScore} color="#00ff88" label="Comfort" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Walk", node: <Counter value={p.walkingTime} suffix=" min" /> },
          { label: "Distance", node: <span>{formatDistance(p.distance, imperial)}</span> },
          { label: "Sun time", node: <Counter value={p.directSunExposure} suffix=" min" /> },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-2.5 text-center">
            <p className="metric text-sm text-foreground">{s.node}</p>
            <p className="mt-0.5 text-[10px] tracking-[0.12em] text-muted-foreground uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {breakdown.map((b) => (
          <div key={b.label}>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="metric" style={{ color: b.color }}>
                {b.value}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${b.value}%`, background: b.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-muted-foreground">Walk on side</p>
          <p className="metric mt-0.5 text-foreground capitalize">{p.streetSide}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-muted-foreground">Heat index</p>
          <p className="metric mt-0.5 text-[color:var(--amber-sun)]">{summary.heatIndex}°C</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-muted-foreground">Shade segments</p>
          <p className="metric mt-0.5 text-foreground">{p.segments.filter((s) => s.shadeLevel >= 50).length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <p className="text-muted-foreground">Crossings</p>
          <p className="metric mt-0.5 text-[color:var(--mint)]">{p.crossingPoints.length}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Crossing points</p>
        {p.crossingPoints.map((c, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px]">
            <span className="capitalize">{c.type}</span>
            <span className="metric text-[color:var(--mint)]">safety {c.safetyScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
