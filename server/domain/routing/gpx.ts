import type { ElevationSample, RouteKind } from '#shared/entities/routing'

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
<gpx version="1.1" creator="kommmit" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${escapeXml(name)}</name>
    <type>${kind}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`
}
