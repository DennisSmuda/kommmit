import { searchAddress } from '../../domain/routing'
import { rateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  rateLimit(event, { name: 'routing-geocode', limit: 20, windowMs: 60_000 })

  const query = getQuery(event)
  const q = typeof query.q === 'string' ? query.q : ''

  return { candidates: await searchAddress(q) }
})
