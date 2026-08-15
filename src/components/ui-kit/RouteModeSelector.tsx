import { Gauge, Scale, Umbrella } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OptimizationMode } from "@/types/route.types";

const MODES: { id: OptimizationMode; label: string; icon: typeof Umbrella; hint: string }[] = [
  { id: "shade", label: "Max Shade", icon: Umbrella, hint: "Prioritises shaded paths above all else" },
  { id: "balanced", label: "Balanced", icon: Scale, hint: "Shade without a big detour" },
  { id: "fastest", label: "Fastest", icon: Gauge, hint: "Traditional shortest walking route" },
];

export function RouteModeSelector({
  value,
  onChange,
}: {
  value: OptimizationMode;
  onChange: (m: OptimizationMode) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {MODES.map((m) => {
        const active = value === m.id;
        const Icon = m.icon;
        return (
          <button
            key={m.id}
            type="button"
            title={m.hint}
            onClick={() => onChange(m.id)}
            className={cn(
              "group flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition-all duration-200",
              active
                ? "border-[color:var(--cyan-glow)]/60 bg-[color:var(--cyan-glow)]/10 text-foreground shadow-[0_0_20px_rgba(0,212,255,0.2)]"
                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground",
            )}
          >
            <Icon
              className={cn("h-4 w-4 transition-transform group-hover:scale-110", active && "text-[color:var(--cyan-glow)]")}
            />
            <span className="text-[11px] font-medium">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
