export interface ElevationPoint {
  lat: number
  lng: number
}

const OPEN_ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup'

// The public instance's reverse proxy rejects request bodies over ~1MB (a
// plain nginx 413, confirmed empirically) — chunk comfortably under that
// rather than lose an entire large batch (e.g. every node in a routing
// graph) to one oversized request.
const BATCH_SIZE = 15_000

interface OpenElevationResult {
  elevation: number
}

async function fetchElevationBatch(points: ElevationPoint[]): Promise<number[]> {
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

/**
 * Chunked into `BATCH_SIZE`-sized requests, sequential rather than parallel
 * to stay polite to a free shared service.
 */
export async function fetchElevations(points: ElevationPoint[]): Promise<number[]> {
  const elevations: number[] = []

  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    elevations.push(...(await fetchElevationBatch(points.slice(i, i + BATCH_SIZE))))
  }

  return elevations
}
