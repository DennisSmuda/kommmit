/** Public API of the `routing` entity — import only from here, not the sibling files directly. */
export type {
  LatLng,
  RouteRequest,
  RouteRequestPoint,
  RouteResult,
  RouteKind,
  RouteSearchResult,
  GeocodeCandidate,
  ElevationSample,
  ElevationProfile,
  SaveRouteRequest,
  SaveRouteResult,
  SavedRouteSummary,
  ListSavedRoutesResult,
  SavedRouteDetail,
} from './types'
export { isLatLng, isRoutePoint } from './point'
export { haversineMeters, bearingDegrees } from './geo'
export { computeRouteProgress } from './progress'
export type { RouteProgress } from './progress'
