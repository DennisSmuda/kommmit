export interface GeocodeHit {
  label: string
  lat: number
  lng: number
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

// Generic and non-personal on purpose — Nominatim's usage policy wants a real
// contact for anything beyond light/dev use, but that's a deploy-time decision,
// not something to hardcode into a header sent to a third party by default.
const USER_AGENT =
  'kommmit-bike-router/0.1 (self-hosted app; set real contact info before high-volume use)'

interface NominatimResult {
  display_name: string
  lat: string
  lon: string
}

export async function searchAddress(query: string, limit = 5): Promise<GeocodeHit[]> {
  const url = new URL(NOMINATIM_URL)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', String(limit))

  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(8_000),
  })

  if (!response.ok) {
    throw new Error(`Nominatim request failed: ${response.status}`)
  }

  const results = (await response.json()) as NominatimResult[]

  return results.map((result) => ({
    label: result.display_name,
    lat: Number(result.lat),
    lng: Number(result.lon),
  }))
}
