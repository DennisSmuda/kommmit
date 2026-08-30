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
      <div class="pointer-events-auto rounded-lg bg-default/90 backdrop-blur shadow">
        <SignOutButton />
      </div>
    </header>

    <div
      class="pointer-events-auto absolute left-4 top-20 w-80 rounded-lg bg-default/90 backdrop-blur p-4 shadow sm:left-6 lg:left-8"
    >
      <FindRouteForm
        :pending="pending"
        :error="error"
        :routes="routes"
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

const { t } = useI18n()

const map = shallowRef<MapLibreMap>()
const { routes, selectedIndex, pending, error, submit, reset } = useFindRoute()
const hoverPoint = ref<LatLng | null>(null)
const { fitToRoutes } = useRouteLayer(
  map,
  routes,
  selectedIndex,
  (i) => (selectedIndex.value = i),
  hoverPoint,
)

const onSubmit = async (origin: RouteRequestPoint, destination: RouteRequestPoint) => {
  await submit(origin, destination)
  if (routes.value.length > 0) fitToRoutes()
}

const onReset = () => {
  reset()
  hoverPoint.value = null
}
</script>
