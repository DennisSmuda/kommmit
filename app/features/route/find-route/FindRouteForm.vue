<template>
  <div class="space-y-3">
    <form
      v-if="!hasResults"
      class="space-y-3"
      @submit.prevent="submit"
    >
      <UFormField
        :label="t('routing.originLabel')"
        name="origin"
        required
      >
        <UInputMenu
          v-model="originSelected"
          v-model:search-term="originQuery"
          :items="originCandidates"
          :loading="originPending"
          :placeholder="t('routing.originPlaceholder')"
          ignore-filter
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UFormField
        :label="t('routing.destinationLabel')"
        name="destination"
        required
      >
        <UInputMenu
          v-model="destinationSelected"
          v-model:search-term="destinationQuery"
          :items="destinationCandidates"
          :loading="destinationPending"
          :placeholder="t('routing.destinationPlaceholder')"
          ignore-filter
          size="lg"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        block
        size="lg"
        color="primary"
        :loading="pending"
        :disabled="pending || !hasOrigin || !hasDestination"
      >
        {{ t('routing.submit') }}
      </UButton>
    </form>

    <template v-else>
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

      <div class="space-y-1.5">
        <button
          v-for="(option, index) in routes"
          :key="index"
          type="button"
          class="w-full rounded-md border px-3 py-2 text-left text-sm transition-colors"
          :class="
            index === selectedIndex
              ? 'border-primary bg-primary/10 text-highlighted'
              : 'border-default hover:bg-elevated/50 text-default'
          "
          @click="emit('select', index)"
        >
          <span class="font-medium">
            {{ routeLabels[index] }}
          </span>
          <span class="text-dimmed">
            &middot;
            {{
              t('routing.distance', {
                distance: (option.distanceMeters / 1000).toFixed(1),
              })
            }}
            &middot;
            {{
              t('routing.duration', { duration: Math.round(option.durationSeconds / 60) })
            }}
          </span>
        </button>
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

      <div
        v-if="selectedRoute"
        class="flex gap-2"
      >
        <SaveRouteButton
          :route="selectedRoute"
          :elevation-profile="elevationProfile"
          :origin-label="originLabel"
          :destination-label="destinationLabel"
          class="flex-1"
        />
        <UButton
          type="button"
          block
          size="lg"
          color="primary"
          icon="i-lucide-navigation"
          class="flex-1"
          @click="emit('navigate', selectedRoute, originLabel, destinationLabel)"
        >
          {{ t('routing.navigate') }}
        </UButton>
      </div>
    </template>

    <UAlert
      v-if="error"
      :title="error"
      color="error"
      variant="soft"
      size="sm"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  GeocodeCandidate,
  LatLng,
  RouteRequestPoint,
  RouteResult,
} from '#shared/entities/routing'
import { ElevationChart } from '~/entities/route'
import { SaveRouteButton } from '~/features/route/save-route'
import { useAddressAutocomplete } from './useAddressAutocomplete'
import { useElevationProfile } from './useElevationProfile'

const props = defineProps<{
  pending: boolean
  error: string
  routes: RouteResult[]
  selectedIndex: number
}>()

const emit = defineEmits<{
  submit: [origin: RouteRequestPoint, destination: RouteRequestPoint]
  select: [index: number]
  hover: [point: LatLng | null]
  reset: []
  navigate: [route: RouteResult, originLabel: string, destinationLabel: string]
}>()

const { t } = useI18n()

const hasResults = computed(() => props.routes.length > 0)

// "Alternative N" numbers only the alternates, so a flattest route slotted
// in after them doesn't skip a number or get mislabeled itself.
const routeLabels = computed(() => {
  let alternativeCount = 0
  return props.routes.map((route) => {
    if (route.kind === 'recommended') return t('routing.recommended')
    if (route.kind === 'flattest') return t('routing.flattest')
    alternativeCount++
    return t('routing.alternative', { n: alternativeCount })
  })
})

const selectedRoute = computed(() => props.routes[props.selectedIndex] ?? null)
const selectedPath = computed(() => selectedRoute.value?.path ?? null)
const { profile: elevationProfile, error: elevationError } =
  useElevationProfile(selectedPath)

const {
  query: originQuery,
  candidates: originCandidates,
  pending: originPending,
} = useAddressAutocomplete()
const {
  query: destinationQuery,
  candidates: destinationCandidates,
  pending: destinationPending,
} = useAddressAutocomplete()

const originSelected = ref<GeocodeCandidate>()
const destinationSelected = ref<GeocodeCandidate>()

// Selecting a suggestion can leave the search-term field blank (the picked
// item's label lives in the model, not necessarily echoed back into it), so
// "has enough to submit" checks both, not just the typed text.
const hasOrigin = computed(() =>
  Boolean(originSelected.value || originQuery.value.trim()),
)
const hasDestination = computed(() =>
  Boolean(destinationSelected.value || destinationQuery.value.trim()),
)

const originLabel = computed(
  () => originSelected.value?.label ?? originQuery.value.trim(),
)
const destinationLabel = computed(
  () => destinationSelected.value?.label ?? destinationQuery.value.trim(),
)

const submit = () => {
  const origin: RouteRequestPoint = originSelected.value
    ? { lat: originSelected.value.lat, lng: originSelected.value.lng }
    : originQuery.value
  const destination: RouteRequestPoint = destinationSelected.value
    ? { lat: destinationSelected.value.lat, lng: destinationSelected.value.lng }
    : destinationQuery.value

  emit('submit', origin, destination)
}
</script>
