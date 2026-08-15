import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { TopNav } from "@/components/common/TopNav";
import { ErrorState, LoadingState } from "@/components/common/LoadingState";
import { RouteInput } from "@/components/panels/RouteInput";
import { RouteResults } from "@/components/panels/RouteResults";
import { RouteDetails } from "@/components/panels/RouteDetails";
import { AIExplanationPanel } from "@/components/panels/AIExplanation";
import { ShadeLegend } from "@/components/ui-kit/ShadeLegend";
import { DEFAULT_DESTINATION, DEFAULT_ORIGIN } from "@/constants/mockData";
import { fetchRoutes, RoutingError, type RoutingErrorCode } from "@/services/routing";
import { fetchExplanation } from "@/services/mock/explanationMock";
import type {
  ExplanationResponse,
  OptimizationMode,
  PlaceOption,
  RouteResponse,
} from "@/types/route.types";
import { cn } from "@/lib/utils";

const MapCanvas = lazy(() =>
  import("@/components/map/MapCanvas").then((m) => ({ default: m.MapCanvas })),
);

const ERROR_MESSAGES: Record<RoutingErrorCode, string> = {
  TIMEOUT: "The routing service took too long to respond. Please try again.",
  NO_ROUTE:
    "No walking route could be found between those two points. Try a different origin or destination.",
  RATE_LIMITED:
    "The routing service is temporarily rate-limiting requests. Please wait a moment and retry.",
  NETWORK_ERROR: "Couldn't reach the routing service. Check your connection and try again.",
  INVALID_RESPONSE: "The routing service returned an unexpected response. Please try again.",
  UNKNOWN: "Something went wrong while calculating your route. Please try again.",
};

const TITLE = "CoolRoute AI — Shade-Optimised Walking Routes";
const DESCRIPTION =
  "Plan pedestrian routes by shade coverage, sun exposure and comfort score. Time-aware urban heat mitigation navigation for hot climates.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoolRoutePage,
  ssr: false,
});

function CoolRoutePage() {
  const [origin, setOrigin] = useState<PlaceOption>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<PlaceOption>(DEFAULT_DESTINATION);
  const [date, setDate] = useState(new Date());
  const [minutes, setMinutes] = useState(13 * 60);
  const [mode, setMode] = useState<OptimizationMode>("shade");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  const [data, setData] = useState<RouteResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputOpen, setInputOpen] = useState(false);

  const [explainOpen, setExplainOpen] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationResponse | null>(null);

  const selected = data?.routes.find((r) => r.id === selectedId) ?? null;

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExplainOpen(false);
    const controller = new AbortController();
    try {
      const res = await fetchRoutes(
        { origin, destination, date, minutes, mode },
        controller.signal,
      );
      setData(res);
      setSelectedId(res.recommended);
      setShowDetails(true);
      setInputOpen(false);
    } catch (err) {
      const message =
        err instanceof RoutingError ? ERROR_MESSAGES[err.code] : ERROR_MESSAGES.UNKNOWN;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [origin, destination, date, minutes, mode]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const explain = useCallback(async () => {
    if (!selected || !data) return;
    setExplainOpen(true);
    setExplaining(true);
    setExplanation(null);
    setExplanation(
      await fetchExplanation(selected, data, { origin, destination, date, minutes, mode }),
    );
    setExplaining(false);
  }, [selected, data, origin, destination, date, minutes, mode]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <Suspense fallback={null}>
        <MapCanvas
          routes={data?.routes ?? []}
          selectedId={selectedId}
          recommendedId={data?.recommended ?? null}
          showAlternatives={showAlternatives}
          origin={origin.coords}
          destination={destination.coords}
          onSelectRoute={setSelectedId}
        />
      </Suspense>

      {/* top nav */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 md:p-4">
        <div className="mx-auto max-w-[1600px]">
          <TopNav
            units={units}
            onToggleUnits={() => setUnits(units === "metric" ? "imperial" : "metric")}
          />
        </div>
      </div>

      {/* left input panel (desktop) */}
      <div className="pointer-events-auto absolute top-20 bottom-4 left-4 z-30 hidden w-[380px] flex-col gap-3 overflow-y-auto md:flex">
        <RouteInput
          origin={origin}
          destination={destination}
          date={date}
          minutes={minutes}
          mode={mode}
          uvIndex={data?.summary.uvIndex ?? 8}
          loading={loading}
          onOrigin={setOrigin}
          onDestination={setDestination}
          onSwap={() => {
            setOrigin(destination);
            setDestination(origin);
          }}
          onDate={setDate}
          onMinutes={setMinutes}
          onMode={setMode}
          onSubmit={() => void run()}
        />
        {selected && data && showDetails && (
          <RouteDetails
            route={selected}
            summary={data.summary}
            imperial={units === "imperial"}
            onExplain={() => void explain()}
            onClose={() => setShowDetails(false)}
          />
        )}
      </div>

      {/* mobile input sheet */}
      <div
        className={cn(
          "pointer-events-auto absolute inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto transition-transform duration-500 md:hidden",
          inputOpen ? "translate-y-0" : "translate-y-[calc(100%-56px)]",
        )}
      >
        <button
          onClick={() => setInputOpen(!inputOpen)}
          className="glass-strong flex w-full items-center justify-center gap-2 rounded-b-none py-4 text-xs font-semibold"
        >
          <ChevronUp className={cn("h-4 w-4 transition-transform", inputOpen && "rotate-180")} />
          {inputOpen ? "Hide planner" : "Plan a shaded route"}
        </button>
        <div className="space-y-3 p-3 pt-0">
          <RouteInput
            origin={origin}
            destination={destination}
            date={date}
            minutes={minutes}
            mode={mode}
            uvIndex={data?.summary.uvIndex ?? 8}
            loading={loading}
            onOrigin={setOrigin}
            onDestination={setDestination}
            onSwap={() => {
              setOrigin(destination);
              setDestination(origin);
            }}
            onDate={setDate}
            onMinutes={setMinutes}
            onMode={setMode}
            onSubmit={() => void run()}
          />
          {selected && data && (
            <RouteDetails
              route={selected}
              summary={data.summary}
              imperial={units === "imperial"}
              onExplain={() => void explain()}
              onClose={() => setInputOpen(false)}
            />
          )}
        </div>
      </div>

      {/* results */}
      {data && (
        <div className="pointer-events-none absolute right-4 bottom-20 left-4 z-30 md:bottom-4 md:left-[412px]">
          <div className="ml-auto max-w-full md:max-w-[760px]">
            <RouteResults
              routes={data.routes}
              selectedId={selectedId}
              recommendedId={data.recommended}
              showAlternatives={showAlternatives}
              onToggleAlternatives={() => setShowAlternatives((v) => !v)}
              onSelect={(id) => {
                setSelectedId(id);
                setShowDetails(true);
              }}
            />
          </div>
        </div>
      )}

      {/* legend */}
      <div className="pointer-events-none absolute top-20 right-4 z-30 hidden lg:block">
        <ShadeLegend minutes={minutes} uvIndex={data?.summary.uvIndex ?? 8} />
      </div>

      <AIExplanationPanel
        open={explainOpen}
        loading={explaining}
        data={explanation}
        route={selected}
        onClose={() => setExplainOpen(false)}
        onRegenerate={() => void explain()}
      />

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => void run()} />}
    </main>
  );
}
