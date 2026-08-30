<template>
  <div
    v-if="activeRoute"
    class="relative h-screen w-screen"
  >
    <ClientOnly>
      <MapCanvas @ready="onMapReady" />
    </ClientOnly>

    <header
      class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4"
    >
      <p
        class="pointer-events-auto rounded-lg bg-default/90 backdrop-blur px-3 py-1.5 shadow text-sm font-medium text-highlighted"
      >
        {{ activeRoute.originLabel }} → {{ activeRoute.destinationLabel }}
      </p>
      <UButton
        class="pointer-events-auto"
        :aria-label="t('navigation.stop')"
        icon="i-lucide-x"
        color="neutral"
        variant="solid"
        square
        @click="onStop"
      />
    </header>

    <UButton
      v-if="!following"
      class="pointer-events-auto absolute right-4 bottom-32 shadow sm:right-6 lg:right-8"
      :aria-label="t('navigation.recenter')"
      icon="i-lucide-locate-fixed"
      color="neutral"
      square
      @click="recenter"
    />

    <div
      class="pointer-events-auto absolute inset-x-4 bottom-4 rounded-lg bg-default/90 backdrop-blur p-4 shadow sm:inset-x-auto sm:left-6 sm:w-80 lg:left-8"
    >
      <UAlert
        v-if="locationError"
        :title="locationError"
        color="error"
        variant="soft"
        size="sm"
        class="mb-3"
      />
      <template v-else-if="offRoute">
        <UAlert
          :title="t('navigation.offRoute', { distance: deviationMeters })"
          color="error"
          variant="soft"
          size="sm"
          class="mb-2"
        />
        <UButton
          block
          size="sm"
          color="error"
          variant="soft"
          icon="i-lucide-route"
          :loading="backRoutePending"
          class="mb-3"
          @click="onGetBackOnTrack"
        >
          {{ t('navigation.getBackOnTrack') }}
        </UButton>
        <UAlert
          v-if="backRouteError"
          :title="backRouteError"
          color="error"
          variant="soft"
          size="sm"
          class="mb-3"
        />
      </template>

      <template v-if="arrived">
        <p class="flex items-center gap-2 text-lg font-semibold text-highlighted">
          <UIcon
            name="i-lucide-flag"
            class="size-5"
          />
          {{ t('navigation.arrived') }}
        </p>
        <UButton
          block
          class="mt-3"
          color="neutral"
          @click="onStop"
        >
          {{ t('navigation.finish') }}
        </UButton>
      </template>
      <template v-else-if="progress">
        <p class="text-2xl font-semibold text-highlighted">
          {{ t('routing.duration', { duration: etaMinutes }) }}
        </p>
        <p class="text-sm text-dimmed">
          {{ t('routing.distance', { distance: remainingKm }) }}
        </p>
      </template>
      <p
        v-else
        class="text-sm text-dimmed"
      >
        {{ t('navigation.locating') }}
      </p>
    </div>
  </div>
  <div
    v-else-if="resolving"
    class="flex h-screen w-screen items-center justify-center bg-default"
  >
    <p class="text-sm text-dimmed">{{ t('navigation.loadingRoute') }}</p>
  </div>
</template>

<script setup lang="ts">
import type {
  GeoJSONSource,
  LineLayerSpecification,
  Map as MapLibreMap,
} from 'maplibre-gl'
import { Marker } from 'maplibre-gl'
import type { LatLng, SavedRouteDetail } from '#shared/entities/routing'
import { bearingDegrees, computeRouteProgress } from '#shared/entities/routing'
import { MapCanvas } from '~/entities/map'
import { useRouteLayer } from '~/entities/route'
import { useFindRoute } from '~/features/route/find-route'
import { useActiveNavigationRoute, useLiveLocation } from '~/features/route/navigate'

const ARRIVAL_THRESHOLD_METERS = 25
// Comfortably past GPS jitter, so a stationary fix near the route doesn't
// flicker the guide line in and out.
const DEVIATION_THRESHOLD_METERS = 30
const FOLLOW_ZOOM = 18
const FOLLOW_PITCH = 60
const GUIDE_SOURCE_ID = 'off-route-guide'
const GUIDE_LAYER_ID = 'off-route-guide-layer'
const BACK_ROUTE_SOURCE_ID = 'off-route-back-route'
const BACK_ROUTE_LAYER_ID = 'off-route-back-route-layer'

const { t } = useI18n()
const urlRoute = useRoute()
const { activeRoute, set, clear } = useActiveNavigationRoute()
const { location, error: locationError, start, stop } = useLiveLocation()
const {
  selectedRoute: backRoute,
  pending: backRoutePending,
  error: backRouteError,
  submit: submitBackRoute,
  reset: resetBackRoute,
} = useFindRoute()

const map = shallowRef<MapLibreMap>()
const following = ref(true)
const noHover = ref<LatLng | null>(null)
const selectedIndex = ref(0)
const resolving = ref(!activeRoute.value)

const path = computed(() => activeRoute.value?.route.path ?? [])
const routes = computed(() => (activeRoute.value ? [activeRoute.value.route] : []))

const { fitToRoutes } = useRouteLayer(map, routes, selectedIndex, () => {}, noHover)

let liveMarker: Marker | undefined
let lastPosition: LatLng | undefined

const progress = computed(() => {
  if (!location.value || path.value.length === 0) return null
  return computeRouteProgress(path.value, location.value.position)
})

const arrived = computed(
  () => (progress.value?.remainingMeters ?? Infinity) <= ARRIVAL_THRESHOLD_METERS,
)

const offRoute = computed(
  () => (progress.value?.deviationMeters ?? 0) > DEVIATION_THRESHOLD_METERS,
)

const deviationMeters = computed(() =>
  progress.value ? Math.round(progress.value.deviationMeters) : 0,
)

const lineFeature = (coordinates: [number, number][]) => ({
  type: 'Feature' as const,
  properties: {},
  geometry: { type: 'LineString' as const, coordinates },
})

// A straight line from where we are back to the nearest point on the
// planned route — not a routed path, just a "head this way" pointer until
// "Get back on track" resolves an actual one.
const guideLineFeature = computed(() => {
  if (!offRoute.value || backRoute.value || !location.value || !progress.value)
    return null
  const nearestPoint = path.value[progress.value.nearestIndex]
  if (!nearestPoint) return null

  return lineFeature([
    [location.value.position.lng, location.value.position.lat],
    [nearestPoint.lng, nearestPoint.lat],
  ])
})

// The actual routed path back to the planned route, once "Get back on
// track" resolves one — replaces the straight pointer above.
const backRouteLineFeature = computed(() => {
  if (!backRoute.value) return null
  return lineFeature(backRoute.value.path.map((point) => [point.lng, point.lat]))
})

const remainingKm = computed(() =>
  progress.value ? (progress.value.remainingMeters / 1000).toFixed(1) : '0',
)

// Live GPS speed gives a truer ETA than the route's planned pace once moving.
const etaMinutes = computed(() => {
  if (!progress.value || !activeRoute.value) return 0
  const speed = location.value?.speedMetersPerSecond
  const route = activeRoute.value.route
  const paceSecondsPerMeter =
    speed && speed > 0.5 ? 1 / speed : route.durationSeconds / route.distanceMeters
  return Math.round((progress.value.remainingMeters * paceSecondsPerMeter) / 60)
})

// coords.heading is only populated while moving with a GPS fix on most
// devices, so fall back to the bearing between consecutive fixes.
const headingFor = (position: LatLng, headingDegrees: number | null) => {
  if (headingDegrees !== null && !Number.isNaN(headingDegrees)) return headingDegrees
  if (lastPosition) return bearingDegrees(lastPosition, position)
  return map.value?.getBearing() ?? 0
}

watch(location, (loc) => {
  const currentMap = map.value
  if (!loc || !currentMap) return

  if (!liveMarker) {
    liveMarker = new Marker({ color: '#2563eb' })
      .setLngLat([loc.position.lng, loc.position.lat])
      .addTo(currentMap)
  } else {
    liveMarker.setLngLat([loc.position.lng, loc.position.lat])
  }

  if (following.value) {
    currentMap.easeTo({
      center: [loc.position.lng, loc.position.lat],
      bearing: headingFor(loc.position, loc.headingDegrees),
      pitch: FOLLOW_PITCH,
      zoom: FOLLOW_ZOOM,
      duration: 800,
    })
  }

  lastPosition = loc.position
})

const onMapReady = (m: MapLibreMap) => {
  map.value = m
  m.on('dragstart', () => {
    following.value = false
  })
}

// line-dasharray isn't data-driven in the style spec, so the straight
// pointer (dashed) and the real routed line (solid) are two layers, only
// one of which ever has data at a time.
type LineFeature = ReturnType<typeof lineFeature>

const syncLineLayer = (
  currentMap: MapLibreMap | undefined,
  sourceId: string,
  layerId: string,
  feature: LineFeature | null,
  paint: LineLayerSpecification['paint'],
) => {
  if (!currentMap) return

  const source = currentMap.getSource<GeoJSONSource>(sourceId)

  if (!feature) {
    if (currentMap.getLayer(layerId)) currentMap.removeLayer(layerId)
    if (source) currentMap.removeSource(sourceId)
    return
  }

  if (source) {
    source.setData(feature)
  } else {
    currentMap.addSource(sourceId, { type: 'geojson', data: feature })
    currentMap.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint,
    })
  }
}

watch([map, guideLineFeature], ([currentMap, feature]) => {
  syncLineLayer(currentMap, GUIDE_SOURCE_ID, GUIDE_LAYER_ID, feature, {
    'line-color': '#dc2626',
    'line-width': 4,
    'line-dasharray': [2, 2],
  })
})

watch([map, backRouteLineFeature], ([currentMap, feature]) => {
  syncLineLayer(currentMap, BACK_ROUTE_SOURCE_ID, BACK_ROUTE_LAYER_ID, feature, {
    'line-color': '#dc2626',
    'line-width': 4,
  })
})

// Once back on the planned route, drop any stale detour so a future
// deviation starts clean instead of showing an outdated routed line.
watch(offRoute, (isOffRoute) => {
  if (!isOffRoute) resetBackRoute()
})

// Fits once the map is ready AND the route has a path — a routeId link
// resolves the route asynchronously after the map itself is already up, so
// fitting only from `onMapReady` would run against an still-empty route.
watch(
  [map, path],
  ([currentMap, currentPath]) => {
    if (currentMap && currentPath.length > 0) fitToRoutes()
  },
  { immediate: true },
)

const recenter = () => {
  following.value = true
  if (location.value && map.value) {
    map.value.easeTo({
      center: [location.value.position.lng, location.value.position.lat],
      zoom: FOLLOW_ZOOM,
      pitch: FOLLOW_PITCH,
    })
  }
}

const onStop = async () => {
  stop()
  clear()
  await navigateTo('/')
}

const onGetBackOnTrack = async () => {
  if (!location.value || !progress.value) return
  const nearestPoint = path.value[progress.value.nearestIndex]
  if (!nearestPoint) return
  await submitBackRoute(location.value.position, nearestPoint)
}

// A routeId query param makes /navigate shareable/bookmarkable: a fresh
// visit has no in-memory active route (the page guard already confirmed the
// id is there), so fetch it here rather than duplicating the fetch in
// middleware, where SSR's cross-await Nuxt context makes it unreliable.
const resolveFromRouteId = async () => {
  const routeId = urlRoute.query.routeId
  if (typeof routeId !== 'string') {
    await navigateTo('/')
    return
  }

  try {
    const detail = await $fetch<SavedRouteDetail>(`/api/routing/saved-routes/${routeId}`)
    set({
      route: detail.route,
      originLabel: detail.originLabel,
      destinationLabel: detail.destinationLabel,
    })
  } catch {
    // Let `/` retry the same fetch and show its existing "could not load
    // this route" error, rather than duplicating that handling here.
    await navigateTo({ path: '/', query: { routeId } })
  } finally {
    resolving.value = false
  }
}

onMounted(async () => {
  if (!activeRoute.value) await resolveFromRouteId()
  if (activeRoute.value) start()
})
onScopeDispose(() => {
  liveMarker?.remove()
  const currentMap = map.value
  if (!currentMap) return
  const layerPairs: [string, string][] = [
    [GUIDE_LAYER_ID, GUIDE_SOURCE_ID],
    [BACK_ROUTE_LAYER_ID, BACK_ROUTE_SOURCE_ID],
  ]
  for (const [layerId, sourceId] of layerPairs) {
    if (currentMap.getLayer(layerId)) currentMap.removeLayer(layerId)
    if (currentMap.getSource(sourceId)) currentMap.removeSource(sourceId)
  }
})
</script>
