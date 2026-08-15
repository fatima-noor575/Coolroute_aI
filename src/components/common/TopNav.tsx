import { HelpCircle, Settings2, Sun } from "lucide-react";
import { APP_NAME } from "@/constants/mockData";

export function TopNav({ units, onToggleUnits }: { units: "metric" | "imperial"; onToggleUnits: () => void }) {
  return (
    <header className="glass-strong pointer-events-auto flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--cyan-glow)]/15 ring-1 ring-[color:var(--cyan-glow)]/40">
          <Sun className="h-4 w-4 text-[color:var(--cyan-glow)]" />
        </span>
        <span className="font-display text-base leading-none font-bold tracking-tight">
          Cool<span className="text-[color:var(--cyan-glow)]">Route</span>
          <span className="metric ml-1 text-[10px] text-[color:var(--mint)]">AI</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleUnits}
          className="metric rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          title="Toggle units"
        >
          {units === "metric" ? "KM" : "MI"}
        </button>
        <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground" title="Settings">
          <Settings2 className="h-4 w-4" />
        </button>
        <button className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground" title="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
