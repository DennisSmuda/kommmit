import { describe, expect, it } from 'vitest'
import { gpxToPath, routeToGpx } from './gpx'

const samples = [
  { lat: 52.5, lng: 13.4, distanceMeters: 0, elevationMeters: 34.1 },
  { lat: 52.51, lng: 13.41, distanceMeters: 100, elevationMeters: 36.7 },
]

describe('routeToGpx', () => {
  it('emits one trkpt per sample, with elevation', () => {
    const gpx = routeToGpx({ name: 'A to B', kind: 'recommended', samples })

    expect(gpx).toContain('<gpx version="1.1"')
    expect(gpx).toContain('<name>A to B</name>')
    expect(gpx).toContain('<type>recommended</type>')
    expect(gpx).toContain('<trkpt lat="52.5" lon="13.4"><ele>34.1</ele></trkpt>')
    expect(gpx).toContain('<trkpt lat="52.51" lon="13.41"><ele>36.7</ele></trkpt>')
  })

  it('escapes special characters in the name', () => {
    const gpx = routeToGpx({ name: 'A & B <ride>', kind: 'flattest', samples })

    expect(gpx).toContain('<name>A &amp; B &lt;ride&gt;</name>')
  })
})

describe('gpxToPath', () => {
  it('recovers lat/lng for each trkpt', () => {
    const gpx = routeToGpx({ name: 'A to B', kind: 'recommended', samples })

    expect(gpxToPath(gpx)).toEqual([
      { lat: 52.5, lng: 13.4 },
      { lat: 52.51, lng: 13.41 },
    ])
  })

  it('returns an empty array for GPX with no trkpts', () => {
    expect(
      gpxToPath(routeToGpx({ name: 'Empty', kind: 'recommended', samples: [] })),
    ).toEqual([])
  })
})
