import { useEffect, useMemo, useRef, useState } from "react";
import { Clock, Crosshair, Globe2, Loader2, MapPin, Search, X } from "lucide-react";
import { PLACES, RECENT_PLACE_IDS } from "@/constants/mockData";
import { searchPlaces, reverseGeocode } from "@/services/geocoding";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { PlaceOption } from "@/types/route.types";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: PlaceOption | null;
  onChange: (p: PlaceOption) => void;
  accent?: "mint" | "cyan";
  showGeolocate?: boolean;
}

export function LocationSearch({ label, value, onChange, accent = "cyan", showGeolocate }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [remoteResults, setRemoteResults] = useState<PlaceOption[]>([]);
  const [errored, setErrored] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 320);
  const abortRef = useRef<AbortController | null>(null);

  const recents = useMemo(
    () => RECENT_PLACE_IDS.map((id) => PLACES.find((p) => p.id === id)!).filter(Boolean),
    [],
  );

  // Live worldwide search — hits the global geocoder for every query, so
  // any city or country works, not just a hardcoded local list.
  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setRemoteResults([]);
      setSearching(false);
      setErrored(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setErrored(false);
    searchPlaces(q, controller.signal)
      .then((res) => {
        if (controller.signal.aborted) return;
        setRemoteResults(res);
        setSearching(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setRemoteResults([]);
        setSearching(false);
        setErrored(true);
      });
    return () => controller.abort();
  }, [debouncedQuery]);

  const results = query.trim() ? remoteResults : recents;
  const dot = accent === "mint" ? "var(--mint)" : "var(--cyan-glow)";

  function geolocate() {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const place = await reverseGeocode(longitude, latitude);
        onChange(
          place ?? {
            id: "current",
            name: "Current location",
            detail: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            coords: [longitude, latitude],
          },
        );
        setLocating(false);
        setOpen(false);
      },
      () => {
        onChange({ ...PLACES[1]!, name: "Current location (approx.)" });
        setLocating(false);
        setOpen(false);
      },
      { timeout: 6000 },
    );
  }

  return (
    <div className="relative">
      <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition-colors focus-within:border-[color:var(--cyan-glow)]/50">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: dot, boxShadow: `0 0 10px ${dot}` }}
        />
        <input
          value={open ? query : (value?.name ?? "")}
          placeholder="Search any city, address or place worldwide…"
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onBlur={() => setTimeout(() => setOpen(false), 140)}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        {searching && (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
        )}
        {value && !open && (
          <button
            type="button"
            onClick={() => onChange({ ...value, name: "" })}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {showGeolocate && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={geolocate}
            title="Use my current location"
            className={cn(
              "rounded-lg p-1 text-muted-foreground transition-colors hover:text-[color:var(--cyan-glow)]",
              locating && "animate-spin text-[color:var(--cyan-glow)]",
            )}
          >
            <Crosshair className="h-4 w-4" />
          </button>
        )}
        {!showGeolocate && !searching && <Search className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>

      {open && (
        <div className="glass-strong absolute z-40 mt-2 w-full overflow-hidden p-1.5">
          {!query && (
            <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              <Clock className="h-3 w-3" /> Recent
            </p>
          )}
          {query && !searching && !errored && (
            <p className="flex items-center gap-1.5 px-2 py-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              <Globe2 className="h-3 w-3" /> Worldwide results
            </p>
          )}
          {searching && (
            <p className="flex items-center gap-1.5 px-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching the globe…
            </p>
          )}
          {!searching && errored && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Couldn't reach the map search service. Check your connection and try again.
            </p>
          )}
          {!searching && !errored && results.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No matching places found.</p>
          )}
          {!searching &&
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/8"
              >
                {query ? (
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[color:var(--cyan-glow)]" />
                ) : (
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm text-foreground">{p.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {p.detail}
                  </span>
                </span>
              </button>
            ))}
          {query && !searching && !errored && results.length > 0 && (
            <p className="border-t border-white/10 px-2 pt-1.5 pb-0.5 text-[9px] text-muted-foreground/70">
              Search by OpenStreetMap contributors
            </p>
          )}
        </div>
      )}
    </div>
  );
}
