export interface LatLng {
  lat: number
  lng: number
}

export type RouteRequestPoint = string | LatLng

export interface RouteRequest {
  origin: RouteRequestPoint
  destination: RouteRequestPoint
}

/**
 * `recommended` is always `routes[0]`. `alternative` routes are other
 * bike-friendly corridors, cheapest first. `flattest` (at most one, always
 * last when present) minimizes total climb instead, independent of the
 * others — it may reuse the same roads.
 */
export type RouteKind = 'recommended' | 'alternative' | 'flattest'

export interface RouteResult {
  kind: RouteKind
  path: LatLng[]
  distanceMeters: number
  durationSeconds: number
}

export interface RouteSearchResult {
  routes: RouteResult[]
}

export interface GeocodeCandidate {
  label: string
  lat: number
  lng: number
}

export interface ElevationSample {
  lat: number
  lng: number
  distanceMeters: number
  elevationMeters: number
}

export interface ElevationProfile {
  samples: ElevationSample[]
  ascentMeters: number
  descentMeters: number
  minElevationMeters: number
  maxElevationMeters: number
}

export interface SaveRouteRequest {
  name: string
  route: Pick<RouteResult, 'kind' | 'distanceMeters' | 'durationSeconds'>
  elevationProfile: ElevationProfile
}

export interface SaveRouteResult {
  id: string
}
