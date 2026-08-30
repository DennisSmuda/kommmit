import type {
  RouteKind,
  SaveRouteRequest,
  SaveRouteResult,
} from '#shared/entities/routing'
import { isLatLng } from '#shared/entities/routing'
import { routeToGpx } from '../../domain/routing'
import prisma from '../../utils/prisma'
import { rateLimit } from '../../utils/rate-limit'

const ROUTE_KINDS: RouteKind[] = ['recommended', 'alternative', 'flattest']
const MAX_NAME_LENGTH = 120

function isSaveRouteRequest(body: unknown): body is SaveRouteRequest {
  if (typeof body !== 'object' || body === null) return false
  const { name, route, elevationProfile } = body as Record<string, unknown>

  if (
    typeof name !== 'string' ||
    name.trim().length === 0 ||
    name.length > MAX_NAME_LENGTH
  ) {
    return false
  }

  if (typeof route !== 'object' || route === null) return false
  const { kind, distanceMeters, durationSeconds } = route as Record<string, unknown>
  if (typeof kind !== 'string' || !ROUTE_KINDS.includes(kind as RouteKind)) return false
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) return false
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds))
    return false

  if (typeof elevationProfile !== 'object' || elevationProfile === null) return false
  const { samples } = elevationProfile as Record<string, unknown>
  if (!Array.isArray(samples) || samples.length === 0) return false

  return samples.every((s) => {
    if (!isLatLng(s)) return false
    const rec = s as unknown as Record<string, unknown>
    return (
      typeof rec.distanceMeters === 'number' && typeof rec.elevationMeters === 'number'
    )
  })
}

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  rateLimit(event, { name: 'routing-save-route', limit: 10, windowMs: 60_000 })

  const body = await readBody<unknown>(event)

  if (!isSaveRouteRequest(body)) {
    throw createError({ statusCode: 400, statusMessage: 'errors.saveRouteInvalid' })
  }

  const gpx = routeToGpx({
    name: body.name.trim(),
    kind: body.route.kind,
    samples: body.elevationProfile.samples,
  })

  const saved = await prisma.savedRoute.create({
    data: {
      userId,
      name: body.name.trim(),
      kind: body.route.kind,
      distanceMeters: body.route.distanceMeters,
      durationSeconds: body.route.durationSeconds,
      gpx,
    },
    select: { id: true },
  })

  return saved satisfies SaveRouteResult
})
