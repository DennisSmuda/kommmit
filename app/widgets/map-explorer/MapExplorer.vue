<template>
  <div class="relative h-screen w-screen">
    <ClientOnly>
      <MapCanvas @ready="(m) => (map = m)" />
    </ClientOnly>

    <header
      class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4"
    >
      <p
        class="pointer-events-auto rounded-lg bg-default/90 backdrop-blur px-3 py-1.5 shadow font-display text-xl font-bold tracking-tight text-highlighted"
      >
        {{ t('meta.title.home') }}
      </p>
      <div
        class="pointer-events-auto flex items-center gap-2 rounded-lg bg-default/90 backdrop-blur shadow"
      >
        <UButton
          to="/routes"
          variant="ghost"
          color="neutral"
          icon="i-lucide-list"
        >
          {{ t('meta.title.routes') }}
        </UButton>
        <SignOutButton />
      </div>
    </header>

    <div
      class="pointer-events-auto absolute left-4 top-20 w-80 rounded-lg bg-default/90 backdrop-blur p-4 shadow sm:left-6 lg:left-8"
    >
      <ViewSavedRoute
        v-if="savedRoute"
        :detail="savedRoute"
        @hover="(point) => (hoverPoint = point)"
        @reset="onReset"
      />
      <FindRouteForm
        v-else
        :pending="pending"
        :error="combinedError"
        :routes="searchRoutes"
        :selected-index="selectedIndex"
        @submit="onSubmit"
        @select="(i) => (selectedIndex = i)"
        @hover="(point) => (hoverPoint = point)"
        @reset="onReset"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { LatLng, RouteRequestPoint } from '#shared/entities/routing'
import { useRouteLayer } from '~/entities/route'
import { MapCanvas } from '~/entities/map'
import { FindRouteForm, useFindRoute } from '~/features/route/find-route'
import { SignOutButton } from '~/features/user/sign-out'
import { useViewSavedRoute, ViewSavedRoute } from '~/features/route/view-saved-route'

const { t } = useI18n()
const urlRoute = useRoute()

const map = shallowRef<MapLibreMap>()
const {
  routes: searchRoutes,
  selectedIndex,
  pending,
  error,
  submit,
  reset,
} = useFindRoute()
const {
  detail: savedRoute,
  load: loadSavedRoute,
  clear: clearSavedRoute,
  error: savedRouteError,
} = useViewSavedRoute()
const hoverPoint = ref<LatLng | null>(null)

const combinedError = computed(() => error.value || savedRouteError.value)
const mapRoutes = computed(() =>
  savedRoute.value ? [savedRoute.value.route] : searchRoutes.value,
)
const mapSelectedIndex = computed(() => (savedRoute.value ? 0 : selectedIndex.value))

const { fitToRoutes } = useRouteLayer(
  map,
  mapRoutes,
  mapSelectedIndex,
  (i) => (selectedIndex.value = i),
  hoverPoint,
)

const onSubmit = async (origin: RouteRequestPoint, destination: RouteRequestPoint) => {
  await submit(origin, destination)
  if (searchRoutes.value.length > 0) fitToRoutes()
}

const onReset = async () => {
  reset()
  clearSavedRoute()
  hoverPoint.value = null
  if (urlRoute.query.routeId) await navigateTo({ path: '/' }, { replace: true })
}

// Arriving from "View" on /routes: load that one saved route in place of a
// live search. The fetch and the map's `ready` event race, so fit once
// whichever finishes last.
onMounted(async () => {
  const routeId = urlRoute.query.routeId
  if (typeof routeId !== 'string') return

  await loadSavedRoute(routeId)
  if (!savedRoute.value) return

  if (map.value) {
    fitToRoutes()
  } else {
    const stop = watch(map, (m) => {
      if (!m) return
      fitToRoutes()
      stop()
    })
  }
})
</script>
