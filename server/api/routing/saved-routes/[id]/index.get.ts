import type { RouteKind, SavedRouteDetail } from '#shared/entities/routing'
import { gpxToPath } from '../../../../domain/routing'
import prisma from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')

  const route = await prisma.savedRoute.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      originLabel: true,
      destinationLabel: true,
      kind: true,
      distanceMeters: true,
      durationSeconds: true,
      gpx: true,
    },
  })

  if (!route) {
    throw createError({ statusCode: 404, statusMessage: 'errors.notFound' })
  }

  return {
    id: route.id,
    name: route.name,
    originLabel: route.originLabel,
    destinationLabel: route.destinationLabel,
    route: {
      kind: route.kind as RouteKind,
      path: gpxToPath(route.gpx),
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
    },
  } satisfies SavedRouteDetail
})
