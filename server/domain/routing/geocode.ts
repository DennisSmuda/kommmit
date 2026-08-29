import type { GeocodeCandidate } from '#shared/entities/routing'
import { searchAddress as fetchAddress } from '../../utils/nominatim'

export async function searchAddress(query: string): Promise<GeocodeCandidate[]> {
  const trimmed = query.trim()

  if (trimmed.length < 3) {
    throw createError({ statusCode: 400, statusMessage: 'errors.addressTooShort' })
  }

  try {
    return await fetchAddress(trimmed)
  } catch (error) {
    console.error('nominatim search failed', error)
    throw createError({ statusCode: 502, statusMessage: 'errors.geocodingUnavailable' })
  }
}
