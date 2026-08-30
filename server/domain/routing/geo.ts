import type { LatLng } from '#shared/entities/routing'
import type { BoundingBox } from '../../utils/overpass'

export { haversineMeters } from '#shared/entities/routing'

const METERS_PER_DEGREE_LAT = 111_320

const toRad = (deg: number) => (deg * Math.PI) / 180

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
