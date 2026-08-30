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

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
}

function isSaveRouteRequest(body: unknown): body is SaveRouteRequest {
  if (typeof body !== 'object' || body === null) return false
  const { name, originLabel, destinationLabel, route, elevationProfile } = body as Record<
    string,
    unknown
  >

  if (!isNonEmptyString(name, MAX_NAME_LENGTH)) return false
  if (!isNonEmptyString(originLabel, MAX_NAME_LENGTH)) return false
  if (!isNonEmptyString(destinationLabel, MAX_NAME_LENGTH)) return false

  if (typeof route !== 'object' || route === null) return false
  const { kind, distanceMeters, durationSeconds } = route as Record<string, unknown>
  if (typeof kind !== 'string' || !ROUTE_KINDS.includes(kind as RouteKind)) return false
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) return false
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds))
    return false

  if (typeof elevationProfile !== 'object' || elevationProfile === null) return false
  const { samples, ascentMeters, descentMeters, minElevationMeters, maxElevationMeters } =
    elevationProfile as Record<string, unknown>
  if (!Array.isArray(samples) || samples.length === 0) return false
  if (
    typeof ascentMeters !== 'number' ||
    typeof descentMeters !== 'number' ||
    typeof minElevationMeters !== 'number' ||
    typeof maxElevationMeters !== 'number'
  ) {
    return false
  }

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
      originLabel: body.originLabel.trim(),
      destinationLabel: body.destinationLabel.trim(),
      kind: body.route.kind,
      distanceMeters: body.route.distanceMeters,
      durationSeconds: body.route.durationSeconds,
      ascentMeters: body.elevationProfile.ascentMeters,
      descentMeters: body.elevationProfile.descentMeters,
      minElevationMeters: body.elevationProfile.minElevationMeters,
      maxElevationMeters: body.elevationProfile.maxElevationMeters,
      gpx,
    },
    select: { id: true },
  })

  return saved satisfies SaveRouteResult
})
