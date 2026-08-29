import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl'
import { Marker } from 'maplibre-gl'
import type { RouteResult } from '#shared/entities/routing'
import { routesToGeoJSON } from './geojson'

const SOURCE_ID = 'route-lines'
const LAYER_ID = 'route-lines-layer'

/**
 * Draws every route in `routes` as a line (the one at `selectedIndex`
 * highlighted), start/end markers for the shared origin/destination, and
 * removes it all when `routes` goes empty. Clicking an unselected line calls
 * `onSelect` with its index — the map is itself a picker, not just a display.
 */
export function useRouteLayer(
  map: Ref<MapLibreMap | undefined>,
  routes: Ref<RouteResult[]>,
  selectedIndex: Ref<number>,
  onSelect: (index: number) => void,
) {
  let startMarker: Marker | undefined
  let endMarker: Marker | undefined

  const clearMarkers = () => {
    startMarker?.remove()
    endMarker?.remove()
    startMarker = undefined
    endMarker = undefined
  }

  const removeLayer = (currentMap: MapLibreMap) => {
    if (currentMap.getLayer(LAYER_ID)) currentMap.removeLayer(LAYER_ID)
    if (currentMap.getSource(SOURCE_ID)) currentMap.removeSource(SOURCE_ID)
  }

  const handleClick = (e: MapMouseEvent & { features?: { properties: unknown }[] }) => {
    const index = (e.features?.[0]?.properties as { routeIndex?: number } | undefined)
      ?.routeIndex
    if (typeof index === 'number') onSelect(index)
  }

  const render = () => {
    const currentMap = map.value
    if (!currentMap) return

    clearMarkers()

    if (routes.value.length === 0) {
      removeLayer(currentMap)
      return
    }

    const geojson = routesToGeoJSON(routes.value, selectedIndex.value)
    const source = currentMap.getSource<GeoJSONSource>(SOURCE_ID)

    // maplibre's own idiom for "update in place" vs "create."
    if (source) {
      source.setData(geojson)
    } else {
      currentMap.addSource(SOURCE_ID, { type: 'geojson', data: geojson })
      currentMap.addLayer({
        id: LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': ['case', ['get', 'selected'], '#2563eb', '#94a3b8'],
          'line-width': ['case', ['get', 'selected'], 5, 3],
        },
      })
      currentMap.on('click', LAYER_ID, handleClick)
      currentMap.on('mouseenter', LAYER_ID, () => {
        currentMap.getCanvas().style.cursor = 'pointer'
      })
      currentMap.on('mouseleave', LAYER_ID, () => {
        currentMap.getCanvas().style.cursor = ''
      })
    }

    // All routes share the same origin/destination — any one's endpoints will do.
    const path = routes.value[0]!.path
    const [start, end] = [path.at(0), path.at(-1)]
    if (start)
      startMarker = new Marker({ color: '#16a34a' })
        .setLngLat([start.lng, start.lat])
        .addTo(currentMap)
    if (end)
      endMarker = new Marker({ color: '#dc2626' })
        .setLngLat([end.lng, end.lat])
        .addTo(currentMap)
  }

  const fitToRoutes = () => {
    const currentMap = map.value
    if (!currentMap || routes.value.length === 0) return

    const points = routes.value.flatMap((r) => r.path)
    const lngs = points.map((p) => p.lng)
    const lats = points.map((p) => p.lat)
    currentMap.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 48 },
    )
  }

  watch([map, routes, selectedIndex], render, { immediate: true })
  onScopeDispose(() => {
    clearMarkers()
    if (map.value) removeLayer(map.value)
  })

  return { fitToRoutes }
}
