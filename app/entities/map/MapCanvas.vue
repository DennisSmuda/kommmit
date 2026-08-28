<template>
  <div
    ref="container"
    class="h-full w-full"
  />
</template>

<script setup lang="ts">
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const props = withDefaults(
  defineProps<{
    center?: [number, number]
    zoom?: number
  }>(),
  {
    center: () => [10, 25],
    zoom: 1.7,
  },
)

const container = ref<HTMLDivElement>()
let map: MapLibreMap | undefined

onMounted(() => {
  map = new MapLibreMap({
    container: container.value!,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: props.center,
    zoom: props.zoom,
    attributionControl: { compact: true },
  })
  map.addControl(new NavigationControl(), 'top-right')
})

onBeforeUnmount(() => {
  map?.remove()
})
</script>
