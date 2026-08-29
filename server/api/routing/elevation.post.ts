import { isLatLng } from '#shared/entities/routing'
import { elevationProfile } from '../../domain/routing'
import { rateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  rateLimit(event, { name: 'routing-elevation', limit: 15, windowMs: 60_000 })

  const body = await readBody<{ path?: unknown }>(event)

  if (!Array.isArray(body.path) || body.path.length === 0 || !body.path.every(isLatLng)) {
    throw createError({ statusCode: 400, statusMessage: 'errors.routePointsRequired' })
  }

  return elevationProfile(body.path)
})
