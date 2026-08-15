import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, MapLayerMouseEvent, Map as MLMap } from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";
import { MAP_STYLE_URL, shadeColor, shadeLabel } from "@/constants/colors";
import type { LngLat, Route } from "@/types/route.types";

interface Props {
  routes: Route[];
  selectedId: string | null;
  recommendedId: string | null;
  showAlternatives: boolean;
  origin: LngLat;
  destination: LngLat;
  onSelectRoute: (id: string) => void;
}

interface HoverInfo {
  x: number;
  y: number;
  level: number;
  source: string;
}

function fc(features: Feature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

export function MapCanvas({
  routes,
  selectedId,
  recommendedId,
  showAlternatives,
  origin,
  destination,
  onSelectRoute,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<{ remove: () => void }[]>([]);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [progress, setProgress] = useState(1);

  // init
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      await import("maplibre-gl/dist/maplibre-gl.css");
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center: origin,
        zoom: 13.4,
        pitch: 45,
        bearing: -18,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      mapRef.current = map;
      map.on("load", () => {
        map.addSource("alt-routes", { type: "geojson", data: fc([]) });
        map.addSource("main-route", { type: "geojson", data: fc([]) });
        map.addSource("crossings", { type: "geojson", data: fc([]) });

        map.addLayer({
          id: "alt-routes-line",
          type: "line",
          source: "alt-routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#7c8db5",
            "line-width": 4,
            "line-opacity": 0.35,
            "line-dasharray": [2, 1.6],
          },
        });
        map.addLayer({
          id: "main-route-glow",
          type: "line",
          source: "main-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#00d4ff", "line-width": 16, "line-opacity": 0.18, "line-blur": 8 },
        });
        map.addLayer({
          id: "main-route-line",
          type: "line",
          source: "main-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": 7 },
        });
        map.addLayer({
          id: "crossings-pt",
          type: "circle",
          source: "crossings",
          paint: {
            "circle-radius": 6,
            "circle-color": "#00ff88",
            "circle-stroke-width": 2,
            "circle-stroke-color": "rgba(10,10,15,0.9)",
          },
        });

        map.on("mousemove", "main-route-line", (e: MapLayerMouseEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          setHover({
            x: e.point.x,
            y: e.point.y,
            level: Number(f.properties?.['shadeLevel'] ?? 0),
            source: String(f.properties?.['source'] ?? "none"),
          });
        });
        map.on("mouseleave", "main-route-line", () => {
          map.getCanvas().style.cursor = "";
          setHover(null);
        });
        map.on("click", "alt-routes-line", (e: MapLayerMouseEvent) => {
          const id = e.features?.[0]?.properties?.['routeId'];
          if (typeof id === "string") onSelectRoute(id);
        });
        setReady(true);
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // animate route drawing whenever the selection changes
  useEffect(() => {
    if (!selectedId) return;
    setProgress(0);
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1600);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selectedId]);

  // data updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const selected = routes.find((r) => r.id === selectedId) ?? routes[0];

    const altFeatures: Feature[] = showAlternatives
      ? routes
          .filter((r) => r.id !== selected?.id)
          .map((r) => ({
            type: "Feature",
            properties: { routeId: r.id },
            geometry: { type: "LineString", coordinates: r.geometry.coordinates },
          }))
      : [];
    (map.getSource("alt-routes") as GeoJSONSource | undefined)?.setData(fc(altFeatures));

    const segs = selected?.properties.segments ?? [];
    const visible = Math.ceil(segs.length * progress);
    const mainFeatures: Feature[] = segs.slice(0, visible).map((s) => ({
      type: "Feature",
      properties: {
        color: shadeColor(s.shadeLevel),
        shadeLevel: s.shadeLevel,
        source: s.source,
      },
      geometry: { type: "LineString", coordinates: [s.start, s.end] },
    }));
    (map.getSource("main-route") as GeoJSONSource | undefined)?.setData(fc(mainFeatures));

    const crossings: Feature[] =
      progress > 0.9
        ? (selected?.properties.crossingPoints ?? []).map((c) => ({
            type: "Feature",
            properties: { type: c.type, safetyScore: c.safetyScore },
            geometry: { type: "Point", coordinates: c.location },
          }))
        : [];
    (map.getSource("crossings") as GeoJSONSource | undefined)?.setData(fc(crossings));
  }, [routes, selectedId, showAlternatives, ready, progress]);

  // markers + camera
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const make = (color: string, label: string) => {
        const el = document.createElement("div");
        el.style.cssText = `width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 0 4px ${color}33, 0 0 18px ${color};border:2px solid rgba(10,10,15,.85)`;
        el.title = label;
        return el;
      };
      markersRef.current.push(
        new maplibregl.Marker({ element: make("#00ff88", "Start") }).setLngLat(origin).addTo(map),
        new maplibregl.Marker({ element: make("#00d4ff", "Destination") })
          .setLngLat(destination)
          .addTo(map),
      );

      const coords = [origin, destination];
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0]),
      );
      routes.forEach((r) => r.geometry.coordinates.forEach((c) => bounds.extend(c)));
      map.fitBounds(bounds, {
        padding: { top: 140, bottom: 240, left: 440, right: 120 },
        duration: 1200,
        essential: true,
        maxZoom: 15.4,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [origin, destination, routes, ready]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
      {hover && (
        <div
          className="glass-strong pointer-events-none absolute z-20 rounded-xl px-3 py-2 text-xs"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="metric text-sm" style={{ color: shadeColor(hover.level) }}>
            {hover.level}% shade
          </p>
          <p className="text-muted-foreground capitalize">
            {shadeLabel(hover.level)} · {hover.source}
          </p>
        </div>
      )}
      {!ready && (
        <div className="absolute inset-0 grid place-items-center bg-background">
          <p className="metric text-xs tracking-widest text-muted-foreground uppercase">
            Initialising map…
          </p>
        </div>
      )}
    </div>
  );
}
