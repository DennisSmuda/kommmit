import type {
  LatLng,
  RouteRequest,
  RouteResult,
  RouteSearchResult,
} from '#shared/entities/routing'
import { isLatLng } from '#shared/entities/routing'
import { fetchOverpassData } from '../../utils/overpass'
import { findAlternateRoutes } from './alternate-routes'
import { searchAddress } from './geocode'
import { boundingBox, haversineMeters } from './geo'
import { buildGraph, nearestNode, type Graph } from './graph'
import { MIN_MULTIPLIER } from './bike-cost'

// Overpass is shared public infrastructure — a bigger bbox gets slow and abusive fast.
// 100 km covers city-to-city touring distances; a dense metro area near that
// cap (e.g. the Ruhrgebiet) can still time out since the whole subgraph is
// fetched and built fresh per request — see overpass.ts's timeout.
const MAX_STRAIGHT_LINE_DISTANCE_M = 100_000
// Room for the route to deviate off the direct line in search of better infrastructure.
const BBOX_PAD_M = 800
// ~15 km/h. A rough estimate only — no elevation, traffic or rider fitness data.
const AVERAGE_BIKE_SPEED_MPS = 4.2
// The primary recommendation plus up to two genuinely distinct alternates.
const MAX_ROUTES = 3

async function resolvePoint(point: LatLng | string): Promise<LatLng> {
  if (isLatLng(point)) return point

  const [candidate] = await searchAddress(point)
  if (!candidate) {
    throw createError({ statusCode: 404, statusMessage: 'errors.addressNotFound' })
  }
  return { lat: candidate.lat, lng: candidate.lng }
}

function toRouteResult(graph: Graph, path: number[]): RouteResult {
  let distanceMeters = 0
  for (let i = 0; i < path.length - 1; i++) {
    const edge = graph.adjacency.get(path[i]!)!.find((e) => e.to === path[i + 1])!
    distanceMeters += edge.distanceMeters
  }

  return {
    path: path.map((id) => {
      const node = graph.nodes.get(id)!
      return { lat: node.lat, lng: node.lon }
    }),
    distanceMeters,
    durationSeconds: distanceMeters / AVERAGE_BIKE_SPEED_MPS,
  }
}

export async function findRoute(request: RouteRequest): Promise<RouteSearchResult> {
  const origin = await resolvePoint(request.origin)
  const destination = await resolvePoint(request.destination)

  if (haversineMeters(origin, destination) > MAX_STRAIGHT_LINE_DISTANCE_M) {
    throw createError({ statusCode: 400, statusMessage: 'errors.routeTooFar' })
  }

  let osm
  try {
    osm = await fetchOverpassData(boundingBox(origin, destination, BBOX_PAD_M))
  } catch (error) {
    console.error('overpass fetch failed', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'errors.routingServiceUnavailable',
    })
  }

  const graph = buildGraph(osm)
  const startNode = nearestNode(graph, origin)
  const goalNode = nearestNode(graph, destination)

  if (startNode === null || goalNode === null) {
    throw createError({ statusCode: 404, statusMessage: 'errors.noNearbyRoad' })
  }

  // Every edge's weight is realDistance * multiplier, and every multiplier is >=
  // MIN_MULTIPLIER, so realDistance * MIN_MULTIPLIER never overestimates the true
  // remaining cost to the goal (triangle inequality bounds realDistance itself by
  // the straight line) — admissible, and tighter than plain haversine would be.
  // Alternate-route penalties only ever raise edge weight, so this stays a valid
  // lower bound no matter how many rounds findAlternateRoutes has run.
  const heuristic = (nodeId: number) => {
    const node = graph.nodes.get(nodeId)!
    return haversineMeters({ lat: node.lat, lng: node.lon }, destination) * MIN_MULTIPLIER
  }
  const neighbors = (nodeId: number) =>
    (graph.adjacency.get(nodeId) ?? []).map((edge) => ({
      id: edge.to,
      weight: edge.weight,
    }))

  const results = findAlternateRoutes(startNode, goalNode, neighbors, heuristic, {
    maxRoutes: MAX_ROUTES,
  })
  if (results.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'errors.noRouteFound' })
  }

  return { routes: results.map((result) => toRouteResult(graph, result.path)) }
}
