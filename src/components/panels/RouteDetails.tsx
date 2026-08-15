import { Sparkles, X } from "lucide-react";
import { RouteStatistics } from "@/components/ui-kit/RouteStatistics";
import type { Route, RouteSummary } from "@/types/route.types";

interface Props {
  route: Route;
  summary: RouteSummary;
  imperial: boolean;
  onExplain: () => void;
  onClose: () => void;
}

export function RouteDetails({ route, summary, imperial, onExplain, onClose }: Props) {
  return (
    <div className="glass-strong pointer-events-auto max-h-[52vh] overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">{route.name} · details</h2>
          <p className="text-sm text-muted-foreground capitalize">{route.properties.badge} route</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <RouteStatistics route={route} summary={summary} imperial={imperial} />

      <button
        onClick={onExplain}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--mint)]/40 bg-[color:var(--mint)]/10 py-3 text-sm font-semibold text-[color:var(--mint)] transition-colors hover:bg-[color:var(--mint)]/20"
      >
        <Sparkles className="h-4 w-4" />
        Why this route?
      </button>
    </div>
  );
}
