export type Tags = Record<string, string>

const EXCLUDED_HIGHWAYS = new Set([
  'motorway',
  'motorway_link',
  'trunk',
  'trunk_link',
  'construction',
  'proposed',
  'raceway',
])

const RESTRICTED_SURFACE_HIGHWAYS = new Set(['footway', 'pedestrian', 'steps'])

const BICYCLE_OVERRIDE = new Set(['yes', 'designated', 'permissive'])

const hasBicycleOverride = (tags: Tags) => BICYCLE_OVERRIDE.has(tags.bicycle ?? '')

export function edgeAllowed(tags: Tags): boolean {
  const highway = tags.highway
  if (!highway || EXCLUDED_HIGHWAYS.has(highway)) return false
  if (RESTRICTED_SURFACE_HIGHWAYS.has(highway) && !hasBicycleOverride(tags)) return false
  if ((tags.access === 'no' || tags.access === 'private') && !hasBicycleOverride(tags))
    return false
  return true
}

const BASE_MULTIPLIERS: Record<string, number> = {
  cycleway: 0.5,
  living_street: 0.8,
  residential: 1.0,
  unclassified: 1.0,
  service: 1.0,
  tertiary: 1.2,
  tertiary_link: 1.2,
  secondary: 1.6,
  secondary_link: 1.6,
  primary: 2.2,
  primary_link: 2.2,
}

/** Lowest value in `BASE_MULTIPLIERS` — kept as its own constant since `astar.ts`'s heuristic must never exceed it. */
export const MIN_MULTIPLIER = 0.5

function baseMultiplier(tags: Tags): number {
  const highway = tags.highway ?? ''

  if (highway === 'path' || highway === 'track') {
    return hasBicycleOverride(tags) ? 0.6 : 0.9
  }

  if (RESTRICTED_SURFACE_HIGHWAYS.has(highway)) {
    // Legal (bicycle override already required by edgeAllowed) but undesirable — likely a dismount.
    return 3.0
  }

  return BASE_MULTIPLIERS[highway] ?? 1.3
}

const CYCLEWAY_KEYS = ['cycleway', 'cycleway:left', 'cycleway:right', 'cycleway:both']

const INFRA_MULTIPLIERS: Record<string, number> = {
  track: 0.6,
  opposite_track: 0.6,
  lane: 0.75,
  opposite_lane: 0.75,
  shared_lane: 0.9,
  share_busway: 0.9,
}

function infraMultiplier(tags: Tags): number | undefined {
  let best: number | undefined

  for (const key of CYCLEWAY_KEYS) {
    const multiplier = INFRA_MULTIPLIERS[tags[key] ?? '']
    if (multiplier !== undefined && (best === undefined || multiplier < best)) {
      best = multiplier
    }
  }

  return best
}

/**
 * Real edge length times this. Lower is preferred. A road with painted/separated
 * bike infrastructure beats the same road bare, but a dedicated `highway=cycleway`
 * still wins outright over any road-plus-lane combination.
 */
export function costMultiplier(tags: Tags): number {
  return Math.min(baseMultiplier(tags), infraMultiplier(tags) ?? Infinity)
}

export type Traversal = 'forward' | 'backward' | 'both'

const OPPOSITE_VALUES = new Set(['opposite', 'opposite_lane', 'opposite_track'])

function hasContraflow(tags: Tags): boolean {
  if (tags['oneway:bicycle'] === 'no') return true
  return CYCLEWAY_KEYS.some((key) => OPPOSITE_VALUES.has(tags[key] ?? ''))
}

/** No `oneway` tag means both directions, for a road or a cycleway alike — the direction only narrows when the way itself is explicitly tagged one-way, and even then a marked contraflow lane reopens it. */
export function wayTraversal(tags: Tags): Traversal {
  const oneway = tags.oneway

  if (oneway !== 'yes' && oneway !== '-1') return 'both'
  if (hasContraflow(tags)) return 'both'

  return oneway === 'yes' ? 'forward' : 'backward'
}
