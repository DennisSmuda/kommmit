<template>
  <form
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

    <UAlert
      v-if="error"
      :title="error"
      color="error"
      variant="soft"
      size="sm"
    />

    <div
      v-if="routes.length > 0"
      class="space-y-1.5"
    >
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
          {{
            index === 0
              ? t('routing.recommended')
              : t('routing.alternative', { n: index })
          }}
        </span>
        <span class="text-dimmed">
          &middot;
          {{
            t('routing.distance', { distance: (option.distanceMeters / 1000).toFixed(1) })
          }}
          &middot;
          {{
            t('routing.duration', { duration: Math.round(option.durationSeconds / 60) })
          }}
        </span>
      </button>
    </div>

    <UButton
      type="submit"
      block
      size="lg"
      color="neutral"
      :loading="pending"
      :disabled="pending || !hasOrigin || !hasDestination"
    >
      {{ t('routing.submit') }}
    </UButton>
  </form>
</template>

<script setup lang="ts">
import type {
  GeocodeCandidate,
  RouteRequestPoint,
  RouteResult,
} from '#shared/entities/routing'
import { useAddressAutocomplete } from './useAddressAutocomplete'

defineProps<{
  pending: boolean
  error: string
  routes: RouteResult[]
  selectedIndex: number
}>()

const emit = defineEmits<{
  submit: [origin: RouteRequestPoint, destination: RouteRequestPoint]
  select: [index: number]
}>()

const { t } = useI18n()

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
