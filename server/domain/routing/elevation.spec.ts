import { describe, expect, it } from 'vitest'
import { computeAscentDescent, resamplePath } from './elevation'

describe('resamplePath', () => {
  it('starts and ends at the original endpoints', () => {
    const path = [
      { lat: 52.0, lng: 5.0 },
      { lat: 52.01, lng: 5.0 },
      { lat: 52.02, lng: 5.01 },
    ]
    const samples = resamplePath(path, 10)

    expect(samples).toHaveLength(10)
    expect(samples[0]).toMatchObject({
      lat: path[0]!.lat,
      lng: path[0]!.lng,
      distanceMeters: 0,
    })
    expect(samples.at(-1)!.lat).toBeCloseTo(path.at(-1)!.lat, 6)
    expect(samples.at(-1)!.lng).toBeCloseTo(path.at(-1)!.lng, 6)
  })

  it('spaces samples at strictly increasing distance', () => {
    const path = [
      { lat: 52.0, lng: 5.0 },
      { lat: 52.05, lng: 5.05 },
    ]
    const samples = resamplePath(path, 5)

    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!.distanceMeters).toBeGreaterThan(samples[i - 1]!.distanceMeters)
    }
  })

  it('handles a single-point path', () => {
    const samples = resamplePath([{ lat: 52.0, lng: 5.0 }], 50)
    expect(samples).toEqual([{ lat: 52.0, lng: 5.0, distanceMeters: 0 }])
  })

  it('handles an empty path', () => {
    expect(resamplePath([], 50)).toEqual([])
  })
})

describe('computeAscentDescent', () => {
  it('sums climbs and drops separately', () => {
    // +10, -5, +20, -30 (only deltas above the noise threshold count)
    expect(computeAscentDescent([100, 110, 105, 125, 95])).toEqual({
      ascentMeters: 30,
      descentMeters: 35,
    })
  })

  it('ignores jitter at or below the noise threshold', () => {
    expect(computeAscentDescent([100, 100.5, 99.6, 100.2])).toEqual({
      ascentMeters: 0,
      descentMeters: 0,
    })
  })

  it('is zero for flat or single-sample profiles', () => {
    expect(computeAscentDescent([100, 100, 100])).toEqual({
      ascentMeters: 0,
      descentMeters: 0,
    })
    expect(computeAscentDescent([100])).toEqual({ ascentMeters: 0, descentMeters: 0 })
    expect(computeAscentDescent([])).toEqual({ ascentMeters: 0, descentMeters: 0 })
  })
})
