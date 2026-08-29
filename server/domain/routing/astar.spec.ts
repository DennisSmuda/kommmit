import { describe, expect, it } from 'vitest'
import { astar } from './astar'

/** a - b - c - d, with a direct a-d edge that's more hops-cheap but costlier than the detour. */
type Edge = { id: string; weight: number }
const graph: Record<string, Edge[]> = {
  a: [
    { id: 'b', weight: 1 },
    { id: 'd', weight: 10 },
  ],
  b: [
    { id: 'a', weight: 1 },
    { id: 'c', weight: 1 },
  ],
  c: [
    { id: 'b', weight: 1 },
    { id: 'd', weight: 1 },
  ],
  d: [
    { id: 'a', weight: 10 },
    { id: 'c', weight: 1 },
  ],
}
const neighbors = (id: string) => graph[id] ?? []
const zeroHeuristic = () => 0

describe('astar', () => {
  it('finds the cheapest path, not just the fewest hops', () => {
    const result = astar('a', 'd', neighbors, zeroHeuristic)
    expect(result?.path).toEqual(['a', 'b', 'c', 'd'])
    expect(result?.cost).toBe(3)
  })

  it('matches Dijkstra when the heuristic is zero', () => {
    const withHeuristic = astar('a', 'd', neighbors, (id) => (id === 'c' ? 1 : 2))
    const withoutHeuristic = astar('a', 'd', neighbors, zeroHeuristic)
    expect(withHeuristic?.cost).toBe(withoutHeuristic?.cost)
  })

  it('returns null for an unreachable goal', () => {
    expect(astar('a', 'z', neighbors, zeroHeuristic)).toBeNull()
  })

  it('returns a zero-cost single-node path when start equals goal', () => {
    expect(astar('a', 'a', neighbors, zeroHeuristic)).toEqual({ path: ['a'], cost: 0 })
  })
})
