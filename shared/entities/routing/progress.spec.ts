import { describe, expect, it } from 'vitest'
import type { LatLng } from './types'
import { computeRouteProgress } from './progress'

// Roughly a straight line north, ~111m per 0.001° latitude.
const path: LatLng[] = [
  { lat: 0, lng: 0 },
  { lat: 0.001, lng: 0 },
  { lat: 0.002, lng: 0 },
  { lat: 0.003, lng: 0 },
]

describe('computeRouteProgress', () => {
  it('returns null for an empty path', () => {
    expect(computeRouteProgress([], { lat: 0, lng: 0 })).toBeNull()
  })

  it('reports zero progress at the start', () => {
    const progress = computeRouteProgress(path, { lat: 0, lng: 0 })!
    expect(progress.nearestIndex).toBe(0)
    expect(progress.traveledMeters).toBe(0)
    expect(progress.fractionComplete).toBe(0)
  })

  it('reports full progress at the end', () => {
    const progress = computeRouteProgress(path, { lat: 0.003, lng: 0 })!
    expect(progress.nearestIndex).toBe(3)
    expect(progress.remainingMeters).toBe(0)
    expect(progress.fractionComplete).toBe(1)
  })

  it('snaps to the nearest vertex and splits distance either side', () => {
    const progress = computeRouteProgress(path, { lat: 0.0021, lng: 0 })!
    expect(progress.nearestIndex).toBe(2)
    expect(progress.traveledMeters).toBeGreaterThan(0)
    expect(progress.remainingMeters).toBeGreaterThan(0)
    expect(progress.fractionComplete).toBeCloseTo(2 / 3, 1)
  })

  it('folds off-path drift into the remaining distance', () => {
    const onPath = computeRouteProgress(path, { lat: 0.003, lng: 0 })!
    const offPath = computeRouteProgress(path, { lat: 0.003, lng: 0.001 })!
    expect(offPath.remainingMeters).toBeGreaterThan(onPath.remainingMeters)
  })
})
