import { Eye, EyeOff } from "lucide-react";
import { RouteCard } from "@/components/ui-kit/RouteCard";
import type { Route } from "@/types/route.types";

interface Props {
  routes: Route[];
  selectedId: string | null;
  recommendedId: string | null;
  showAlternatives: boolean;
  onToggleAlternatives: () => void;
  onSelect: (id: string) => void;
}

export function RouteResults({
  routes,
  selectedId,
  recommendedId,
  showAlternatives,
  onToggleAlternatives,
  onSelect,
}: Props) {
  return (
    <div className="pointer-events-auto">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {routes.length} candidate routes
        </p>
        <button
          onClick={onToggleAlternatives}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {showAlternatives ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          Alternatives
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {routes.map((r) => (
          <RouteCard
            key={r.id}
            route={r}
            selected={r.id === selectedId}
            recommended={r.id === recommendedId}
            onSelect={() => onSelect(r.id)}
          />
        ))}
      </div>
    </div>
  );
}
