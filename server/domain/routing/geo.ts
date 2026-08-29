import type { LatLng } from '#shared/entities/routing'
import type { BoundingBox } from '../../utils/overpass'

const EARTH_RADIUS_M = 6_371_000
const METERS_PER_DEGREE_LAT = 111_320

const toRad = (deg: number) => (deg * Math.PI) / 180

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function boundingBox(a: LatLng, b: LatLng, padMeters: number): BoundingBox {
  const minLat = Math.min(a.lat, b.lat)
  const maxLat = Math.max(a.lat, b.lat)
  const minLng = Math.min(a.lng, b.lng)
  const maxLng = Math.max(a.lng, b.lng)

  const latPad = padMeters / METERS_PER_DEGREE_LAT
  // Longitude degrees shrink toward the poles — correct by the box's average latitude.
  const lngPad =
    padMeters / (METERS_PER_DEGREE_LAT * Math.cos(toRad((minLat + maxLat) / 2)))

  return {
    minLat: minLat - latPad,
    minLon: minLng - lngPad,
    maxLat: maxLat + latPad,
    maxLon: maxLng + lngPad,
  }
}
