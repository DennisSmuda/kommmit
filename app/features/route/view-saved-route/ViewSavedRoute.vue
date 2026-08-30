<template>
  <div class="space-y-3">
    <UButton
      type="button"
      variant="link"
      color="neutral"
      icon="i-lucide-arrow-left"
      class="-ml-2.5"
      @click="emit('reset')"
    >
      {{ t('routing.newSearch') }}
    </UButton>

    <div class="rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm">
      <span class="font-medium text-highlighted">{{ detail.name }}</span>
      <span class="text-dimmed">
        &middot;
        {{
          t('routing.distance', {
            distance: (detail.route.distanceMeters / 1000).toFixed(1),
          })
        }}
        &middot;
        {{
          t('routing.duration', {
            duration: Math.round(detail.route.durationSeconds / 60),
          })
        }}
      </span>
    </div>

    <ElevationChart
      v-if="elevationProfile"
      :profile="elevationProfile"
      @hover="(point) => emit('hover', point)"
    />
    <p
      v-else-if="elevationError"
      class="text-xs text-dimmed"
    >
      {{ elevationError }}
    </p>

    <UButton
      type="button"
      block
      size="lg"
      color="neutral"
      variant="soft"
      disabled
    >
      {{ t('routing.navigate') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
import type { LatLng, SavedRouteDetail } from '#shared/entities/routing'
import { ElevationChart } from '~/entities/route'
import { useElevationProfile } from '~/features/route/find-route'

const props = defineProps<{ detail: SavedRouteDetail }>()

const emit = defineEmits<{
  hover: [point: LatLng | null]
  reset: []
}>()

const { t } = useI18n()

const path = computed<LatLng[] | null>(() => props.detail.route.path)
const { profile: elevationProfile, error: elevationError } = useElevationProfile(path)
</script>
