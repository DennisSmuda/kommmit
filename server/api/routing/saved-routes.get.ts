import type { ListSavedRoutesResult, RouteKind } from '#shared/entities/routing'
import prisma from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)

  const routes = await prisma.savedRoute.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      originLabel: true,
      destinationLabel: true,
      kind: true,
      distanceMeters: true,
      durationSeconds: true,
      ascentMeters: true,
      descentMeters: true,
      minElevationMeters: true,
      maxElevationMeters: true,
      createdAt: true,
    },
  })

  return {
    routes: routes.map((r) => ({
      ...r,
      kind: r.kind as RouteKind,
      createdAt: r.createdAt.toISOString(),
    })),
  } satisfies ListSavedRoutesResult
})
