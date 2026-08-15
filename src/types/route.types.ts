export type LngLat = [number, number];

export type OptimizationMode = "shade" | "balanced" | "fastest";

export interface PlaceOption {
  id: string;
  name: string;
  detail: string;
  coords: LngLat;
}

export interface ShadeSegment {
  start: LngLat;
  end: LngLat;
  shadeLevel: number; // 0-100
  source: "tree" | "building" | "structure" | "none";
  length: number; // meters
}

export interface CrossingPoint {
  location: LngLat;
  type: "crosswalk" | "underpass" | "bridge";
  safetyScore: number; // 0-100
}

export interface Route {
  id: string;
  name: string;
  geometry: {
    type: "LineString";
    coordinates: LngLat[];
  };
  properties: {
    walkingTime: number; // minutes
    distance: number; // meters
    shadeCoverage: number; // 0-100
    directSunExposure: number; // minutes
    comfortScore: number; // 0-100
    segments: ShadeSegment[];
    crossingPoints: CrossingPoint[];
    streetSide: "left" | "right" | "mixed";
    badge: string;
    mode: OptimizationMode;
  };
}

export interface RouteSummary {
  uvIndex: number;
  heatIndex: number; // °C
  cloudCover: number; // percentage
  sunAzimuth: number; // degrees
  sunElevation: number; // degrees
}

export interface RouteResponse {
  routes: Route[];
  recommended: string;
  summary: RouteSummary;
}

export interface ExplanationResponse {
  explanation: string;
  factors: {
    shadeOptimization: string;
    timeConsideration: string;
    weatherImpact: string;
    alternativeComparison: string;
    recommendations: string[];
  };
  confidence: number;
}

export interface RouteRequest {
  origin: PlaceOption;
  destination: PlaceOption;
  date: Date;
  minutes: number; // minutes from midnight
  mode: OptimizationMode;
}
