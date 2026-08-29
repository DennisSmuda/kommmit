import type { LatLng } from '#shared/entities/routing'
import type { OsmData } from '../../utils/overpass'
import { costMultiplier, edgeAllowed, wayTraversal } from './bike-cost'
import { haversineMeters } from './geo'

export interface GraphNode {
  id: number
  lat: number
  lon: number
}

export interface GraphEdge {
  to: number
  weight: number
  distanceMeters: number
}

export interface Graph {
  nodes: Map<number, GraphNode>
  adjacency: Map<number, GraphEdge[]>
}

function addEdge(adjacency: Map<number, GraphEdge[]>, from: number, edge: GraphEdge) {
  const edges = adjacency.get(from)
  if (edges) edges.push(edge)
  else adjacency.set(from, [edge])
}

export function buildGraph(osm: OsmData): Graph {
  const nodes = new Map<number, GraphNode>()
  const adjacency = new Map<number, GraphEdge[]>()

  for (const way of osm.ways) {
    if (!edgeAllowed(way.tags)) continue

    const multiplier = costMultiplier(way.tags)
    const direction = wayTraversal(way.tags)

    for (let i = 0; i < way.nodeIds.length - 1; i++) {
      const a = osm.nodes.get(way.nodeIds[i]!)
      const b = osm.nodes.get(way.nodeIds[i + 1]!)
      if (!a || !b) continue

      nodes.set(a.id, a)
      nodes.set(b.id, b)

      const distanceMeters = haversineMeters(
        { lat: a.lat, lng: a.lon },
        { lat: b.lat, lng: b.lon },
      )
      const weight = distanceMeters * multiplier

      if (direction !== 'backward')
        addEdge(adjacency, a.id, { to: b.id, weight, distanceMeters })
      if (direction !== 'forward')
        addEdge(adjacency, b.id, { to: a.id, weight, distanceMeters })
    }
  }

  return { nodes, adjacency }
}

/** Brute-force nearest-node scan — fine at the node counts a fair-use-capped bbox produces; a spatial index would be the move at larger scale. */
export function nearestNode(graph: Graph, point: LatLng): number | null {
  let bestId: number | null = null
  let bestDistance = Infinity

  for (const node of graph.nodes.values()) {
    const distance = haversineMeters(point, { lat: node.lat, lng: node.lon })
    if (distance < bestDistance) {
      bestDistance = distance
      bestId = node.id
    }
  }

  return bestId
}
