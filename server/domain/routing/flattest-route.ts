import type { LatLng } from '#shared/entities/routing'
import { fetchElevations } from '../../utils/open-elevation'
import { astar } from './astar'
import { haversineMeters } from './geo'
import type { Graph } from './graph'

// A batch elevation lookup for every graph node, not just a route's sampled
// points — fetchElevations chunks around Open-Elevation's per-request size
// limit, but a very large dense-city graph would still mean many sequential
// requests. Skip the flattest option above this rather than let it make
// every route search noticeably slower for a nice-to-have.
const MAX_NODES_FOR_ELEVATION = 60_000
// Each vertical meter of climb costs as much as this many flat meters —
// strongly discourages hills without refusing to ever climb one (sometimes
// the destination just sits on top of one). Tuned by feel, not measurement.
const CLIMB_PENALTY_METERS_PER_METER = 20

/** Real distance, plus a penalty for the uphill portion only — descending or flat costs just the distance. */
export function edgeWeightWithClimb(
  distanceMeters: number,
  fromElevationMeters: number,
  toElevationMeters: number,
): number {
  const climb = Math.max(0, toElevationMeters - fromElevationMeters)
  return distanceMeters + climb * CLIMB_PENALTY_METERS_PER_METER
}

/**
 * The same graph as the bike-preference routes, re-weighted to minimize
 * total climb instead of preferring cycle infrastructure — free to reuse
 * their roads, since it's optimizing for a different thing entirely.
 * Returns null (never throws) on any failure: this is an enhancement on top
 * of routing that already succeeded, not something that should break it.
 * Failure is silent to the caller and there's no dedup against the
 * recommended route — see TECH_DEBT.md.
 */
export async function findFlattestPath(
  graph: Graph,
  startNode: number,
  goalNode: number,
  destination: LatLng,
): Promise<number[] | null> {
  if (graph.nodes.size === 0 || graph.nodes.size > MAX_NODES_FOR_ELEVATION) return null

  const nodeIds = [...graph.nodes.keys()]

  let elevations: number[]
  try {
    elevations = await fetchElevations(
      nodeIds.map((id) => {
        const node = graph.nodes.get(id)!
        return { lat: node.lat, lng: node.lon }
      }),
    )
  } catch (error) {
    console.error('open-elevation fetch failed (flattest route)', error)
    return null
  }
  if (elevations.length !== nodeIds.length) return null

  const elevationByNode = new Map(nodeIds.map((id, i) => [id, elevations[i]!]))

  const neighbors = (nodeId: number) =>
    (graph.adjacency.get(nodeId) ?? []).map((edge) => ({
      id: edge.to,
      weight: edgeWeightWithClimb(
        edge.distanceMeters,
        elevationByNode.get(nodeId) ?? 0,
        elevationByNode.get(edge.to) ?? 0,
      ),
    }))

  // Every edge's weight is at least its real distance (climb only adds cost),
  // so plain haversine distance to the goal never overestimates true remaining
  // cost — admissible.
  const heuristic = (nodeId: number) => {
    const node = graph.nodes.get(nodeId)!
    return haversineMeters({ lat: node.lat, lng: node.lon }, destination)
  }

  const result = astar(startNode, goalNode, neighbors, heuristic)
  return result?.path ?? null
}
