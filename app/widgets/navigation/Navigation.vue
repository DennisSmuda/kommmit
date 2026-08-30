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
import type { Map as MapLibreMap } from 'maplibre-gl'
import { Marker } from 'maplibre-gl'
import type { LatLng, SavedRouteDetail } from '#shared/entities/routing'
import { bearingDegrees, computeRouteProgress } from '#shared/entities/routing'
import { MapCanvas } from '~/entities/map'
import { useRouteLayer } from '~/entities/route'
import { useActiveNavigationRoute, useLiveLocation } from '~/features/route/navigate'

const ARRIVAL_THRESHOLD_METERS = 25
const FOLLOW_ZOOM = 18
const FOLLOW_PITCH = 60

const { t } = useI18n()
const urlRoute = useRoute()
const { activeRoute, set, clear } = useActiveNavigationRoute()
const { location, error: locationError, start, stop } = useLiveLocation()

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
  fitToRoutes()
  m.on('dragstart', () => {
    following.value = false
  })
}

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
onScopeDispose(() => liveMarker?.remove())
</script>
