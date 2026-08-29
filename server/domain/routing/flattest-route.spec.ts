import { describe, expect, it } from 'vitest'
import { edgeWeightWithClimb } from './flattest-route'

describe('edgeWeightWithClimb', () => {
  it('costs exactly the distance when flat', () => {
    expect(edgeWeightWithClimb(100, 50, 50)).toBe(100)
  })

  it('costs exactly the distance when descending', () => {
    expect(edgeWeightWithClimb(100, 50, 10)).toBe(100)
  })

  it('adds a penalty proportional to the climb when ascending', () => {
    const flat = edgeWeightWithClimb(100, 50, 50)
    const climbing = edgeWeightWithClimb(100, 50, 60)
    expect(climbing).toBeGreaterThan(flat)
  })

  it('never costs less than the real distance', () => {
    expect(edgeWeightWithClimb(100, 0, 100)).toBeGreaterThanOrEqual(100)
    expect(edgeWeightWithClimb(100, 100, 0)).toBeGreaterThanOrEqual(100)
  })

  it('a steeper climb over the same distance costs more', () => {
    const gentle = edgeWeightWithClimb(100, 50, 55)
    const steep = edgeWeightWithClimb(100, 50, 70)
    expect(steep).toBeGreaterThan(gentle)
  })
})
