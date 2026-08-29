export interface ElevationPoint {
  lat: number
  lng: number
}

const OPEN_ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup'

interface OpenElevationResult {
  elevation: number
}

/**
 * One batch request for every point — Open-Elevation's public instance is a
 * community-run service with no guaranteed uptime/latency, so fewer round
 * trips beats fewer points per trip.
 */
export async function fetchElevations(points: ElevationPoint[]): Promise<number[]> {
  const response = await fetch(OPEN_ELEVATION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: points.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Open-Elevation request failed: ${response.status}`)
  }

  const body = (await response.json()) as { results?: OpenElevationResult[] }
  return (body.results ?? []).map((r) => r.elevation)
}
