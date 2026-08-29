import type { RouteResult } from '#shared/entities/routing'

// Minimal shape rather than the `geojson` package's ambient global types —
// those resolve inside maplibre-gl's own types but aren't reliably
// resolvable from app code in this project's pnpm layout.
export interface RouteLineFeature {
  type: 'Feature'
  properties: { routeIndex: number; selected: boolean }
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

export interface RouteLineFeatureCollection {
  type: 'FeatureCollection'
  features: RouteLineFeature[]
}

// GeoJSON coordinates are [lng, lat] — the opposite order from `LatLng`.
export function routesToGeoJSON(
  routes: RouteResult[],
  selectedIndex: number,
): RouteLineFeatureCollection {
  const toFeature = (route: RouteResult, index: number): RouteLineFeature => ({
    type: 'Feature',
    properties: { routeIndex: index, selected: index === selectedIndex },
    geometry: {
      type: 'LineString',
      coordinates: route.path.map((point) => [point.lng, point.lat]),
    },
  })

  // Drawn in this order so the selected route's thicker line lands on top of
  // the alternates instead of underneath them where they overlap.
  const features = routes
    .map(toFeature)
    .sort((a, b) => Number(a.properties.selected) - Number(b.properties.selected))

  return { type: 'FeatureCollection', features }
}
