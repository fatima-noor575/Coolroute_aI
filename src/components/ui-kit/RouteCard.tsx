import { Clock, Footprints, Umbrella } from "lucide-react";
import type { Route } from "@/types/route.types";
import { formatDistance, formatMinutes } from "@/utils/formatters";
import { shadeColor } from "@/constants/colors";
import { cn } from "@/lib/utils";

interface Props {
  route: Route;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}

export function RouteCard({ route, selected, recommended, onSelect }: Props) {
  const p = route.properties;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "glass min-w-[218px] flex-1 cursor-pointer p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
        selected && "glow-cyan",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">{route.name}</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            recommended
              ? "bg-[color:var(--cyan-glow)]/15 text-[color:var(--cyan-glow)] ring-1 ring-[color:var(--cyan-glow)]/40"
              : "bg-white/8 text-muted-foreground",
          )}
        >
          {recommended ? "Recommended" : p.badge}
        </span>
      </div>

      <div className="metric mt-3 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatMinutes(p.walkingTime)}
        </span>
        <span className="flex items-center gap-1.5">
          <Footprints className="h-3.5 w-3.5 text-muted-foreground" />
          {formatDistance(p.distance)}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Umbrella className="h-3.5 w-3.5" /> Shade
          </span>
          <span className="metric" style={{ color: shadeColor(p.shadeCoverage) }}>
            {p.shadeCoverage}%
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${p.shadeCoverage}%`, background: shadeColor(p.shadeCoverage) }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="metric">Comfort {p.comfortScore}</span>
        <span className="metric">{p.directSunExposure} min sun</span>
      </div>
    </button>
  );
}
