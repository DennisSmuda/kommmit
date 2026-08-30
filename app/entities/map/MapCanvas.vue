<template>
  <div
    ref="container"
    class="h-full w-full bg-[#edf0ea]"
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
    center: () => [10, 50],
    zoom: 2.7,
  },
)

const emit = defineEmits<{ ready: [map: MapLibreMap] }>()

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
  // Layers/sources can't be added before the style finishes loading.
  map.on('load', () => emit('ready', map!))
})

onBeforeUnmount(() => {
  map?.remove()
})
</script>
