import { astar, type AStarResult } from './astar'

export interface AlternateRoutesOptions {
  /** Routes to return, including the first (best) one. */
  maxRoutes: number
  /** Safety cap on total A* runs — the search space may not have this many distinct routes. */
  maxAttempts?: number
  /** Multiplier applied to an edge's weight each time an accepted route uses it. */
  penaltyFactor?: number
  /** Reject a candidate whose edges overlap any accepted route by more than this fraction. */
  maxOverlapRatio?: number
}

/**
 * Repeatedly re-runs A*, penalizing the edges of each accepted route so the
 * next run is pushed onto a different corridor — the "plateau method" for
 * cheap, meaningfully-distinct alternate routes without a full k-shortest-paths
 * algorithm. The heuristic stays admissible regardless: penalties only ever
 * increase edge weight, never lower it below the heuristic's bound.
 */
export function findAlternateRoutes<Id>(
  start: Id,
  goal: Id,
  neighbors: (id: Id) => Iterable<{ id: Id; weight: number }>,
  heuristic: (id: Id) => number,
  options: AlternateRoutesOptions,
): AStarResult<Id>[] {
  const {
    maxRoutes,
    maxAttempts = maxRoutes * 4,
    penaltyFactor = 4,
    maxOverlapRatio = 0.6,
  } = options

  const penalties = new Map<Id, Map<Id, number>>()
  const accepted: AStarResult<Id>[] = []
  const acceptedEdgeSets: Set<string>[] = []

  const penalizedNeighbors = (id: Id) => {
    const row = penalties.get(id)
    const out: { id: Id; weight: number }[] = []
    for (const edge of neighbors(id)) {
      out.push({ id: edge.id, weight: edge.weight * (row?.get(edge.id) ?? 1) })
    }
    return out
  }

  let attempts = 0
  while (accepted.length < maxRoutes && attempts < maxAttempts) {
    attempts++

    const result = astar(start, goal, penalizedNeighbors, heuristic)
    if (!result) break

    const edgeSet = pathToEdgeSet(result.path)
    const tooSimilar = acceptedEdgeSets.some(
      (accepted) => overlapRatio(edgeSet, accepted) > maxOverlapRatio,
    )

    if (!tooSimilar) {
      accepted.push(result)
      acceptedEdgeSets.push(edgeSet)
    }

    // Penalize regardless of acceptance, or a rejected near-duplicate just recurs forever.
    for (let i = 0; i < result.path.length - 1; i++) {
      const a = result.path[i]!
      const b = result.path[i + 1]!
      const row = penalties.get(a) ?? new Map<Id, number>()
      row.set(b, (row.get(b) ?? 1) * penaltyFactor)
      penalties.set(a, row)
    }
  }

  return accepted
}

function pathToEdgeSet<Id>(path: Id[]): Set<string> {
  const edges = new Set<string>()
  for (let i = 0; i < path.length - 1; i++) edges.add(`${path[i]}->${path[i + 1]}`)
  return edges
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  let shared = 0
  for (const edge of a) if (b.has(edge)) shared++
  return shared / Math.min(a.size, b.size)
}
