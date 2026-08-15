import { Sun } from "lucide-react";
import { formatClock } from "@/utils/formatters";

export function ShadeLegend({ minutes, uvIndex }: { minutes: number; uvIndex: number }) {
  return (
    <div className="glass-strong w-64 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Shade coverage
        </p>
        <span className="metric rounded-full px-2 py-0.5 text-[10px] text-[color:var(--amber-sun)] ring-1 ring-[color:var(--amber-sun)]/40">
          UV {uvIndex}
        </span>
      </div>
      <div
        className="h-2.5 w-full rounded-full"
        style={{
          background:
            "linear-gradient(90deg,#FF4B3E 0%,#FF8C00 25%,#FFD23F 50%,#5AC8FF 75%,#0A5BFF 100%)",
        }}
      />
      <div className="metric mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
        <Sun className="h-3.5 w-3.5 text-[color:var(--amber-sun)]" />
        <span>Sun position at</span>
        <span className="metric text-foreground">{formatClock(minutes)}</span>
      </div>
    </div>
  );
}
