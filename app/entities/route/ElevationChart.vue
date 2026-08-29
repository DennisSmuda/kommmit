<template>
  <div class="space-y-1">
    <p class="text-sm">
      <span class="text-highlighted font-medium">
        {{ t('routing.ascent', { value: Math.round(profile.ascentMeters) }) }}
      </span>
      <span class="text-dimmed"> &middot; </span>
      <span class="text-highlighted font-medium">
        {{ t('routing.descent', { value: Math.round(profile.descentMeters) }) }}
      </span>
    </p>

    <div class="flex items-stretch gap-2">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        preserveAspectRatio="none"
        class="h-16 flex-1 cursor-crosshair text-primary"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
      >
        <polygon
          :points="areaPoints"
          fill="currentColor"
          class="opacity-15"
        />
        <polyline
          :points="linePoints"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <g v-if="hoverPoint">
          <line
            :x1="hoverPoint.x"
            :x2="hoverPoint.x"
            y1="0"
            :y2="height"
            stroke="currentColor"
            stroke-width="1"
            class="opacity-40"
          />
          <circle
            :cx="hoverPoint.x"
            :cy="hoverPoint.y"
            r="4"
            fill="currentColor"
            stroke="white"
            stroke-width="1.5"
          />
        </g>
      </svg>
      <div class="flex h-16 flex-col justify-between text-xs text-dimmed">
        <span>{{
          t('routing.elevation', { value: Math.round(profile.maxElevationMeters) })
        }}</span>
        <span>{{
          t('routing.elevation', { value: Math.round(profile.minElevationMeters) })
        }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ElevationProfile, LatLng } from '#shared/entities/routing'

const props = defineProps<{ profile: ElevationProfile }>()

const emit = defineEmits<{
  hover: [point: LatLng | null]
}>()

const { t } = useI18n()

const width = 280
const height = 64

const toXY = (sample: ElevationProfile['samples'][number]) => {
  const { samples, minElevationMeters, maxElevationMeters } = props.profile
  const totalDistance = samples.at(-1)?.distanceMeters || 1
  const range = maxElevationMeters - minElevationMeters || 1

  return {
    x: (sample.distanceMeters / totalDistance) * width,
    y: height - ((sample.elevationMeters - minElevationMeters) / range) * height,
  }
}

const coords = computed(() => props.profile.samples.map(toXY))

const linePoints = computed(() =>
  coords.value.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
)
const areaPoints = computed(() => {
  const points = coords.value.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  return `0,${height} ${points} ${width},${height}`
})

const hoverPoint = ref<{ x: number; y: number } | null>(null)

const onMouseMove = (event: MouseEvent) => {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))

  const samples = props.profile.samples
  const index = Math.round(fraction * (samples.length - 1))
  const sample = samples[index]
  if (!sample) return

  hoverPoint.value = toXY(sample)
  emit('hover', { lat: sample.lat, lng: sample.lng })
}

const onMouseLeave = () => {
  hoverPoint.value = null
  emit('hover', null)
}

// A route switch swaps `profile` without necessarily moving the mouse off the
// chart, which would otherwise leave a stale hover dot pointing at the old route.
watch(
  () => props.profile,
  () => onMouseLeave(),
)
</script>
