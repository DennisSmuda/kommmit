import type { ElevationProfile, ElevationSample, LatLng } from '#shared/entities/routing'
import { fetchElevations } from '../../utils/open-elevation'
import { haversineMeters } from './geo'

// Enough points for a smooth-looking chart without over-querying a shared free service.
const SAMPLE_COUNT = 50
// Sample-to-sample noise below this is treated as flat — elevation data has
// meter-scale jitter that would otherwise inflate ascent/descent for a route
// that's actually level.
const NOISE_THRESHOLD_M = 1

export interface PathSample {
  lat: number
  lng: number
  distanceMeters: number
}

/** Evenly-spaced points by distance along `path`, linearly interpolated between the original points that bracket each one. */
export function resamplePath(path: LatLng[], sampleCount: number): PathSample[] {
  if (path.length === 0) return []
  if (path.length === 1) return [{ ...path[0]!, distanceMeters: 0 }]

  const cumulative = [0]
  for (let i = 1; i < path.length; i++) {
    cumulative.push(cumulative[i - 1]! + haversineMeters(path[i - 1]!, path[i]!))
  }
  const total = cumulative.at(-1)!

  const samples: PathSample[] = []
  for (let s = 0; s < sampleCount; s++) {
    const targetDistance = (total * s) / (sampleCount - 1)

    let i = 1
    while (i < cumulative.length - 1 && cumulative[i]! < targetDistance) i++

    const segStart = cumulative[i - 1]!
    const segEnd = cumulative[i]!
    const t = segEnd > segStart ? (targetDistance - segStart) / (segEnd - segStart) : 0
    const a = path[i - 1]!
    const b = path[i]!

    samples.push({
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
      distanceMeters: targetDistance,
    })
  }
  return samples
}

/** Cumulative climb/drop across a sequence of elevations, ignoring jitter below `NOISE_THRESHOLD_M`. */
export function computeAscentDescent(elevations: number[]): {
  ascentMeters: number
  descentMeters: number
} {
  let ascentMeters = 0
  let descentMeters = 0

  for (let i = 1; i < elevations.length; i++) {
    const delta = elevations[i]! - elevations[i - 1]!
    if (delta > NOISE_THRESHOLD_M) ascentMeters += delta
    else if (delta < -NOISE_THRESHOLD_M) descentMeters += -delta
  }

  return { ascentMeters, descentMeters }
}

export async function elevationProfile(path: LatLng[]): Promise<ElevationProfile> {
  const samples = resamplePath(path, Math.min(SAMPLE_COUNT, path.length))

  let elevations: number[]
  try {
    elevations = await fetchElevations(samples)
  } catch (error) {
    console.error('open-elevation fetch failed', error)
    throw createError({ statusCode: 502, statusMessage: 'errors.elevationUnavailable' })
  }

  if (elevations.length !== samples.length) {
    throw createError({ statusCode: 502, statusMessage: 'errors.elevationUnavailable' })
  }

  const profileSamples: ElevationSample[] = samples.map((sample, i) => ({
    lat: sample.lat,
    lng: sample.lng,
    distanceMeters: sample.distanceMeters,
    elevationMeters: elevations[i]!,
  }))

  const { ascentMeters, descentMeters } = computeAscentDescent(elevations)

  return {
    samples: profileSamples,
    ascentMeters,
    descentMeters,
    minElevationMeters: Math.min(...elevations),
    maxElevationMeters: Math.max(...elevations),
  }
}
