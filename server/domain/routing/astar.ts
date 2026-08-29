export interface AStarResult<Id> {
  path: Id[]
  cost: number
}

interface HeapEntry<Id> {
  id: Id
  fScore: number
}

/** Array-backed binary min-heap keyed by `fScore` — a re-sorted array is O(n log n) per pop, and OSM road graphs run to tens of thousands of nodes even in a modest bbox. */
class MinHeap<Id> {
  private items: HeapEntry<Id>[] = []

  get size() {
    return this.items.length
  }

  push(entry: HeapEntry<Id>) {
    this.items.push(entry)
    let i = this.items.length - 1

    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.items[parent]!.fScore <= this.items[i]!.fScore) break
      ;[this.items[parent], this.items[i]] = [this.items[i]!, this.items[parent]!]
      i = parent
    }
  }

  pop(): HeapEntry<Id> | undefined {
    const top = this.items[0]
    const last = this.items.pop()
    if (this.items.length === 0 || !last) return top
    this.items[0] = last

    let i = 0
    while (true) {
      const left = i * 2 + 1
      const right = i * 2 + 2
      let smallest = i

      if (
        left < this.items.length &&
        this.items[left]!.fScore < this.items[smallest]!.fScore
      ) {
        smallest = left
      }
      if (
        right < this.items.length &&
        this.items[right]!.fScore < this.items[smallest]!.fScore
      ) {
        smallest = right
      }
      if (smallest === i) break

      ;[this.items[i], this.items[smallest]] = [this.items[smallest]!, this.items[i]!]
      i = smallest
    }

    return top
  }
}

/**
 * Generic A* — no knowledge of `Graph`/OSM, just node ids, a neighbor lookup
 * and a heuristic. Kept decoupled so it's testable against tiny synthetic
 * graphs and reusable for anything else that's a weighted graph later.
 */
export function astar<Id>(
  start: Id,
  goal: Id,
  neighbors: (id: Id) => Iterable<{ id: Id; weight: number }>,
  heuristic: (id: Id) => number,
): AStarResult<Id> | null {
  if (start === goal) return { path: [start], cost: 0 }

  const gScore = new Map<Id, number>([[start, 0]])
  const cameFrom = new Map<Id, Id>()
  const closed = new Set<Id>()

  const open = new MinHeap<Id>()
  open.push({ id: start, fScore: heuristic(start) })

  while (open.size > 0) {
    const current = open.pop()!.id
    if (closed.has(current)) continue
    if (current === goal)
      return { path: reconstruct(cameFrom, goal), cost: gScore.get(goal)! }

    closed.add(current)

    for (const neighbor of neighbors(current)) {
      if (closed.has(neighbor.id)) continue

      const tentativeG = gScore.get(current)! + neighbor.weight
      const knownG = gScore.get(neighbor.id)

      if (knownG === undefined || tentativeG < knownG) {
        gScore.set(neighbor.id, tentativeG)
        cameFrom.set(neighbor.id, current)
        open.push({ id: neighbor.id, fScore: tentativeG + heuristic(neighbor.id) })
      }
    }
  }

  return null
}

function reconstruct<Id>(cameFrom: Map<Id, Id>, goal: Id): Id[] {
  const path = [goal]
  let current = goal

  while (cameFrom.has(current)) {
    current = cameFrom.get(current)!
    path.push(current)
  }

  return path.reverse()
}
