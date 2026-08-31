import type { ElevationSample, LatLng, RouteKind } from '#shared/entities/routing'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface RouteToGpxInput {
  name: string
  kind: RouteKind
  samples: ElevationSample[]
}

/**
 * Serializes a route to GPX 1.1. Track points come from the elevation
 * profile's samples, not the raw route path — they're already the
 * resampled points with elevation attached, so this needs no extra fetch.
 */
export function routeToGpx({ name, kind, samples }: RouteToGpxInput): string {
  const trkpts = samples
    .map(
      (s) =>
        `      <trkpt lat="${s.lat}" lon="${s.lng}"><ele>${s.elevationMeters.toFixed(1)}</ele></trkpt>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Arschwasser" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name)}</name>
    <type>${kind}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`
}

const TRKPT_REGEX = /<trkpt lat="([^"]+)" lon="([^"]+)">/g

/**
 * Recovers the path from GPX emitted by `routeToGpx` — lat/lon only, no
 * elevation. The trkpts are the elevation profile's resampled points, not
 * the original routing path, but that's what viewing a saved route needs:
 * the elevation is refetched for this path anyway (see useElevationProfile).
 */
export function gpxToPath(gpx: string): LatLng[] {
  return [...gpx.matchAll(TRKPT_REGEX)].map(([, lat, lon]) => ({
    lat: Number(lat),
    lng: Number(lon),
  }))
}
