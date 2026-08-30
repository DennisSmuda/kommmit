import prisma from '../../../../utils/prisma'

export default defineEventHandler(async (event) => {
  const userId = await requireUserId(event)
  const id = getRouterParam(event, 'id')

  const route = await prisma.savedRoute.findFirst({
    where: { id, userId },
    select: { name: true, gpx: true },
  })

  if (!route) {
    throw createError({ statusCode: 404, statusMessage: 'errors.notFound' })
  }

  const filename = `${route.name.trim().replace(/[^a-z0-9-_]+/gi, '-')}.gpx`

  setResponseHeader(event, 'Content-Type', 'application/gpx+xml')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

  return route.gpx
})
