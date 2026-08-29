import { describe, expect, it } from 'vitest'
import { costMultiplier, edgeAllowed, MIN_MULTIPLIER, wayTraversal } from './bike-cost'

describe('edgeAllowed', () => {
  it('excludes motorways', () => {
    expect(edgeAllowed({ highway: 'motorway' })).toBe(false)
  })

  it('allows residential roads', () => {
    expect(edgeAllowed({ highway: 'residential' })).toBe(true)
  })

  it('excludes footways without a bicycle override', () => {
    expect(edgeAllowed({ highway: 'footway' })).toBe(false)
  })

  it('allows footways designated for bicycles', () => {
    expect(edgeAllowed({ highway: 'footway', bicycle: 'designated' })).toBe(true)
  })

  it('excludes private access without a bicycle override', () => {
    expect(edgeAllowed({ highway: 'service', access: 'private' })).toBe(false)
  })

  it('allows private access with bicycle=yes', () => {
    expect(edgeAllowed({ highway: 'service', access: 'private', bicycle: 'yes' })).toBe(
      true,
    )
  })

  it('excludes ways under construction', () => {
    expect(edgeAllowed({ highway: 'construction' })).toBe(false)
  })

  it('excludes ways with no highway tag', () => {
    expect(edgeAllowed({})).toBe(false)
  })
})

describe('costMultiplier', () => {
  it('prefers a dedicated cycleway over a residential road', () => {
    expect(costMultiplier({ highway: 'cycleway' })).toBeLessThan(
      costMultiplier({ highway: 'residential' }),
    )
  })

  it('prefers a residential road over a primary road', () => {
    expect(costMultiplier({ highway: 'residential' })).toBeLessThan(
      costMultiplier({ highway: 'primary' }),
    )
  })

  it('a residential road with a track beats the same road bare', () => {
    expect(
      costMultiplier({ highway: 'residential', 'cycleway:right': 'track' }),
    ).toBeLessThan(costMultiplier({ highway: 'residential' }))
  })

  it('a primary road with a lane beats the same road bare, but loses to a dedicated cycleway', () => {
    const withLane = costMultiplier({ highway: 'primary', cycleway: 'lane' })
    expect(withLane).toBeLessThan(costMultiplier({ highway: 'primary' }))
    expect(withLane).toBeGreaterThan(costMultiplier({ highway: 'cycleway' }))
  })

  it('MIN_MULTIPLIER matches the table minimum', () => {
    const cases: Record<string, string>[] = [
      { highway: 'cycleway' },
      { highway: 'residential' },
      { highway: 'primary' },
      { highway: 'path', bicycle: 'designated' },
      { highway: 'residential', cycleway: 'track' },
      { highway: 'primary', cycleway: 'lane' },
      { highway: 'footway', bicycle: 'yes' },
    ]
    const min = Math.min(...cases.map(costMultiplier))
    expect(min).toBeGreaterThanOrEqual(MIN_MULTIPLIER)
    expect(costMultiplier({ highway: 'cycleway' })).toBe(MIN_MULTIPLIER)
  })
})

describe('wayTraversal', () => {
  it('is bidirectional with no oneway tag', () => {
    expect(wayTraversal({ highway: 'residential' })).toBe('both')
  })

  it('follows an explicit oneway', () => {
    expect(wayTraversal({ highway: 'residential', oneway: 'yes' })).toBe('forward')
    expect(wayTraversal({ highway: 'residential', oneway: '-1' })).toBe('backward')
  })

  it('reopens both directions when bicycles are exempted from a oneway', () => {
    expect(
      wayTraversal({ highway: 'residential', oneway: 'yes', 'oneway:bicycle': 'no' }),
    ).toBe('both')
  })

  it('reopens both directions for a marked contraflow lane', () => {
    expect(
      wayTraversal({ highway: 'residential', oneway: 'yes', cycleway: 'opposite' }),
    ).toBe('both')
  })

  it('a cycleway with no oneway tag is bidirectional', () => {
    expect(wayTraversal({ highway: 'cycleway' })).toBe('both')
  })

  it('an explicitly one-way cycleway is respected', () => {
    expect(wayTraversal({ highway: 'cycleway', oneway: 'yes' })).toBe('forward')
  })
})
