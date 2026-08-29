import { describe, expect, it } from 'vitest'
import { findAlternateRoutes } from './alternate-routes'

/** Two fully disjoint corridors of similar cost, both a -> z. */
type Edge = { id: string; weight: number }
const twoCorridorGraph: Record<string, Edge[]> = {
  a: [
    { id: 'b1', weight: 1 },
    { id: 'c1', weight: 1 },
  ],
  b1: [{ id: 'b2', weight: 1 }],
  b2: [{ id: 'b3', weight: 1 }],
  b3: [{ id: 'z', weight: 1 }],
  c1: [{ id: 'c2', weight: 1.1 }],
  c2: [{ id: 'c3', weight: 1.1 }],
  c3: [{ id: 'z', weight: 1.1 }],
}
const neighbors = (graph: Record<string, Edge[]>) => (id: string) => graph[id] ?? []
const zeroHeuristic = () => 0

/** A single corridor with no alternative route at all. */
const singlePathGraph: Record<string, Edge[]> = {
  a: [{ id: 'b', weight: 1 }],
  b: [{ id: 'z', weight: 1 }],
}

describe('findAlternateRoutes', () => {
  it('returns the two disjoint corridors, cheapest first', () => {
    const routes = findAlternateRoutes(
      'a',
      'z',
      neighbors(twoCorridorGraph),
      zeroHeuristic,
      { maxRoutes: 2 },
    )

    expect(routes).toHaveLength(2)
    expect(routes[0]!.path).toEqual(['a', 'b1', 'b2', 'b3', 'z'])
    expect(routes[1]!.path).toEqual(['a', 'c1', 'c2', 'c3', 'z'])
  })

  it('stops early when the graph has no distinct alternate', () => {
    const routes = findAlternateRoutes(
      'a',
      'z',
      neighbors(singlePathGraph),
      zeroHeuristic,
      { maxRoutes: 3 },
    )

    expect(routes).toHaveLength(1)
    expect(routes[0]!.path).toEqual(['a', 'b', 'z'])
  })

  it('returns nothing when there is no route at all', () => {
    const routes = findAlternateRoutes('a', 'unreachable', neighbors({}), zeroHeuristic, {
      maxRoutes: 2,
    })

    expect(routes).toEqual([])
  })
})
