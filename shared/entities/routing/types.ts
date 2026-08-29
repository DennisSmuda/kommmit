export interface LatLng {
  lat: number
  lng: number
}

export type RouteRequestPoint = string | LatLng

export interface RouteRequest {
  origin: RouteRequestPoint
  destination: RouteRequestPoint
}

export interface RouteResult {
  path: LatLng[]
  distanceMeters: number
  durationSeconds: number
}

/** `routes[0]` is the primary recommendation; the rest are alternates, cheapest first, when the graph had distinct corridors to offer. */
export interface RouteSearchResult {
  routes: RouteResult[]
}

export interface GeocodeCandidate {
  label: string
  lat: number
  lng: number
}
