import type { LatLng } from './types'
import { haversineMeters } from './geo'

export interface RouteProgress {
  nearestIndex: number
  /** Distance from `position` to `path[nearestIndex]` — how far off the route it is. */
  deviationMeters: number
  traveledMeters: number
  remainingMeters: number
  fractionComplete: number
}

/**
 * Snaps `position` to its nearest vertex on `path` and sums distance either
 * side of it. Nearest-vertex rather than nearest-segment projection — `path`
 * is already dense road-graph geometry, and the simpler measure is plenty
 * for a progress readout.
 */
export function computeRouteProgress(
  path: LatLng[],
  position: LatLng,
): RouteProgress | null {
  if (path.length === 0) return null

  let nearestIndex = 0
  let nearestDistance = Infinity
  for (let i = 0; i < path.length; i++) {
    const distance = haversineMeters(path[i]!, position)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = i
    }
  }

  let traveledMeters = 0
  for (let i = 0; i < nearestIndex; i++) {
    traveledMeters += haversineMeters(path[i]!, path[i + 1]!)
  }

  let remainingMeters = nearestDistance
  for (let i = nearestIndex; i < path.length - 1; i++) {
    remainingMeters += haversineMeters(path[i]!, path[i + 1]!)
  }

  const totalMeters = traveledMeters + remainingMeters
  const fractionComplete = totalMeters > 0 ? traveledMeters / totalMeters : 0

  return {
    nearestIndex,
    deviationMeters: nearestDistance,
    traveledMeters,
    remainingMeters,
    fractionComplete,
  }
}
