import type { LatLng, RouteRequestPoint } from './types'

export function isLatLng(value: unknown): value is LatLng {
  if (typeof value !== 'object' || value === null) return false
  const { lat, lng } = value as Record<string, unknown>
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

export function isRoutePoint(value: unknown): value is RouteRequestPoint {
  if (typeof value === 'string') return value.trim().length > 0
  return isLatLng(value)
}
