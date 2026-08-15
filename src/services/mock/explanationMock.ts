import type { ExplanationResponse, Route, RouteResponse, RouteRequest } from "@/types/route.types";
import { formatClock, formatDistance, formatMinutes } from "@/utils/formatters";

export async function fetchExplanation(
  route: Route,
  response: RouteResponse,
  req: RouteRequest,
): Promise<ExplanationResponse> {
  await new Promise((r) => setTimeout(r, 900));
  const p = route.properties;
  const others = response.routes.filter((r) => r.id !== route.id);
  const fastest = [...response.routes].sort(
    (a, b) => a.properties.walkingTime - b.properties.walkingTime,
  )[0]!;
  const treeSegments = p.segments.filter((s) => s.source === "tree").length;
  const buildingSegments = p.segments.filter((s) => s.source === "building").length;

  return {
    confidence: Math.min(97, 70 + Math.round(p.shadeCoverage / 4)),
    explanation:
      `At ${formatClock(req.minutes)} the sun sits ${response.summary.sunElevation}° above the horizon on a ` +
      `${response.summary.sunAzimuth}° bearing, so building facades on the east–west corridors are casting long, ` +
      `continuous shadow bands. ${route.name} threads those bands for ${p.shadeCoverage}% of its ` +
      `${formatDistance(p.distance)}, leaving only ${p.directSunExposure} minutes of direct exposure across a ` +
      `${formatMinutes(p.walkingTime)} walk. That is the highest comfort score available for your ` +
      `"${p.mode}" preference right now.`,
    factors: {
      shadeOptimization:
        `${treeSegments} street-tree canopy segments and ${buildingSegments} building-shadow segments were chained ` +
        `together, keeping you on the ${p.streetSide} side of the street wherever the shadow line permits.`,
      timeConsideration:
        `Departure at ${formatClock(req.minutes)} means shadow geometry shifts by roughly 15° during the walk; the ` +
        `route front-loads the most exposed blocks so you clear them before peak azimuth drift.`,
      weatherImpact:
        `UV index ${response.summary.uvIndex}, heat index ${response.summary.heatIndex}°C and ` +
        `${response.summary.cloudCover}% cloud cover were factored into the comfort score of ${p.comfortScore}.`,
      alternativeComparison:
        others
          .map(
            (o) =>
              `${o.name}: ${o.properties.shadeCoverage}% shade, ${formatMinutes(o.properties.walkingTime)} — ` +
              `${o.properties.shadeCoverage < p.shadeCoverage ? "less shade" : "more shade"} than the recommendation.`,
          )
          .join(" ") +
        ` The pure-speed option (${fastest.name}) saves ${Math.max(
          0,
          p.walkingTime - fastest.properties.walkingTime,
        )} minutes but adds direct-sun time.`,
      recommendations: [
        `Cross at the ${p.crossingPoints[0]?.type ?? "crosswalk"} marked on the map — it keeps you in shadow through the intersection.`,
        `Walk on the ${p.streetSide} side of the street for the first third of the route.`,
        `Carry water: ${p.directSunExposure} minutes of unshaded walking at heat index ${response.summary.heatIndex}°C.`,
        response.summary.uvIndex >= 6
          ? "UV is high — sunscreen and a hat are recommended."
          : "UV is moderate — no special sun protection required.",
      ],
    },
  };
}
