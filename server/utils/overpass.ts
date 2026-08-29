export interface OsmNode {
  id: number
  lat: number
  lon: number
}

export interface OsmWay {
  id: number
  nodeIds: number[]
  tags: Record<string, string>
}

export interface OsmData {
  nodes: Map<number, OsmNode>
  ways: OsmWay[]
}

export interface BoundingBox {
  minLat: number
  minLon: number
  maxLat: number
  maxLon: number
}

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

interface OverpassElement {
  type: 'node' | 'way'
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags?: Record<string, string>
}

/**
 * All ways tagged `highway` in the box, plus every node they reference
 * (`(._;>;)` recurses down from ways to their nodes) — everything `graph.ts`
 * needs to build a routable network, in one round trip.
 */
// Matches the AbortSignal timeout below — a 100km-capped bbox over a dense
// metro area can take a while for Overpass to assemble.
const QUERY_TIMEOUT_S = 60

function buildQuery(bbox: BoundingBox): string {
  const { minLat, minLon, maxLat, maxLon } = bbox
  return `[out:json][timeout:${QUERY_TIMEOUT_S}];way["highway"](${minLat},${minLon},${maxLat},${maxLon});(._;>;);out body;`
}

// Overpass rejects requests with no identifying User-Agent (Node's fetch sends none by default).
const USER_AGENT =
  'kommmit-bike-router/0.1 (self-hosted app; set real contact info before high-volume use)'

export async function fetchOverpassData(bbox: BoundingBox): Promise<OsmData> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(buildQuery(bbox))}`,
    signal: AbortSignal.timeout((QUERY_TIMEOUT_S + 5) * 1000),
  })

  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.status}`)
  }

  const body = (await response.json()) as { elements?: OverpassElement[] }
  const elements = body.elements ?? []

  const nodes = new Map<number, OsmNode>()
  const ways: OsmWay[] = []

  for (const element of elements) {
    if (
      element.type === 'node' &&
      element.lat !== undefined &&
      element.lon !== undefined
    ) {
      nodes.set(element.id, { id: element.id, lat: element.lat, lon: element.lon })
    } else if (element.type === 'way' && element.nodes) {
      ways.push({ id: element.id, nodeIds: element.nodes, tags: element.tags ?? {} })
    }
  }

  return { nodes, ways }
}
