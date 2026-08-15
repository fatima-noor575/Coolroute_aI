import { ArrowUpDown, Navigation } from "lucide-react";
import { LocationSearch } from "@/components/ui-kit/LocationSearch";
import { DateTimeSelector } from "@/components/ui-kit/DateTimeSelector";
import { RouteModeSelector } from "@/components/ui-kit/RouteModeSelector";
import type { OptimizationMode, PlaceOption } from "@/types/route.types";

interface Props {
  origin: PlaceOption;
  destination: PlaceOption;
  date: Date;
  minutes: number;
  mode: OptimizationMode;
  uvIndex: number;
  loading: boolean;
  onOrigin: (p: PlaceOption) => void;
  onDestination: (p: PlaceOption) => void;
  onSwap: () => void;
  onDate: (d: Date) => void;
  onMinutes: (m: number) => void;
  onMode: (m: OptimizationMode) => void;
  onSubmit: () => void;
}

export function RouteInput(props: Props) {
  return (
    <div className="glass-strong pointer-events-auto p-4">
      <div className="relative space-y-2.5">
        <LocationSearch label="Start" accent="mint" value={props.origin} onChange={props.onOrigin} showGeolocate />
        <LocationSearch label="Destination" value={props.destination} onChange={props.onDestination} />
        <button
          type="button"
          onClick={props.onSwap}
          title="Swap locations"
          className="absolute top-[42px] right-0 z-10 -translate-y-1/2 translate-x-1/2 rounded-full border border-white/15 bg-[#12131f] p-1.5 text-muted-foreground transition-colors hover:text-[color:var(--cyan-glow)]"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4">
        <DateTimeSelector
          date={props.date}
          minutes={props.minutes}
          uvIndex={props.uvIndex}
          onDateChange={props.onDate}
          onMinutesChange={props.onMinutes}
        />
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          Optimise for
        </p>
        <RouteModeSelector value={props.mode} onChange={props.onMode} />
      </div>

      <button
        type="button"
        disabled={props.loading}
        onClick={props.onSubmit}
        className="animate-pulse-cta mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[color:var(--cyan-glow)] to-[color:var(--mint)] px-4 py-3 text-sm font-semibold text-[#08131a] transition-transform hover:scale-[1.015] disabled:opacity-60"
      >
        <Navigation className="h-4 w-4" />
        {props.loading ? "Finding shade…" : "Find My Route"}
      </button>
    </div>
  );
}
