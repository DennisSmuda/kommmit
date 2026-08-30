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

// Elevation is static, and callers (per-route profiles, per-graph-node lookups for
// the flattest route) repeatedly query overlapping points, so a process-wide cache
// avoids re-hitting the shared free service for coordinates we've already looked up.
// ~1.1m grid at the equator — coarser than GPS/OSM node accuracy, so rounding here
// doesn't lose anything a real route would notice.
const CACHE_PRECISION = 5
// Bounds memory for a long-running process; a big-city graph alone can be tens of
// thousands of nodes (see MAX_NODES_FOR_ELEVATION), so this covers many of those.
const MAX_CACHE_ENTRIES = 500_000

const elevationCache = new Map<string, number>()

function cacheKey(point: ElevationPoint): string {
  return `${point.lat.toFixed(CACHE_PRECISION)},${point.lng.toFixed(CACHE_PRECISION)}`
}

/** Map preserves insertion order, so dropping the oldest half is a cheap approximate-LRU. */
function evictOldestHalf() {
  const keys = elevationCache.keys()
  for (let i = 0; i < elevationCache.size / 2; i++) {
    elevationCache.delete(keys.next().value!)
  }
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
 * to stay polite to a free shared service. Cached per-point across calls.
 */
export async function fetchElevations(points: ElevationPoint[]): Promise<number[]> {
  const results = new Array<number>(points.length)
  const misses: { point: ElevationPoint; index: number }[] = []

  points.forEach((point, index) => {
    const cached = elevationCache.get(cacheKey(point))
    if (cached !== undefined) results[index] = cached
    else misses.push({ point, index })
  })

  for (let i = 0; i < misses.length; i += BATCH_SIZE) {
    const chunk = misses.slice(i, i + BATCH_SIZE)
    const elevations = await fetchElevationBatch(chunk.map((m) => m.point))

    if (elevations.length !== chunk.length) {
      throw new Error('Open-Elevation returned a mismatched result count')
    }

    if (elevationCache.size >= MAX_CACHE_ENTRIES) evictOldestHalf()

    chunk.forEach(({ point, index }, j) => {
      const elevation = elevations[j]!
      results[index] = elevation
      elevationCache.set(cacheKey(point), elevation)
    })
  }

  return results
}
