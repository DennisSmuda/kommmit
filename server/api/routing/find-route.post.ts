import { isRoutePoint } from '#shared/entities/routing'
import { findRoute } from '../../domain/routing'
import { rateLimit } from '../../utils/rate-limit'

export default defineEventHandler(async (event) => {
  await requireUserId(event)
  rateLimit(event, { name: 'routing-find-route', limit: 10, windowMs: 60_000 })

  const body = await readBody<{ origin?: unknown; destination?: unknown }>(event)

  if (!isRoutePoint(body.origin) || !isRoutePoint(body.destination)) {
    throw createError({ statusCode: 400, statusMessage: 'errors.routePointsRequired' })
  }

  return findRoute({ origin: body.origin, destination: body.destination })
})
