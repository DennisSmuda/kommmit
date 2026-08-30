<template>
  <UButton
    type="button"
    block
    size="lg"
    :color="saved ? 'success' : 'neutral'"
    :variant="saved ? 'soft' : 'solid'"
    :icon="saved ? 'i-lucide-check' : undefined"
    :loading="saving"
    :disabled="!elevationProfile || saving"
    @click="onClick"
  >
    {{ saved ? t('routing.saved') : t('routing.save') }}
  </UButton>
  <p
    v-if="error"
    class="text-xs text-error"
  >
    {{ error }}
  </p>
</template>

<script setup lang="ts">
import type { ElevationProfile, RouteResult } from '#shared/entities/routing'
import { useSaveRoute } from './useSaveRoute'

const props = defineProps<{
  route: RouteResult
  elevationProfile: ElevationProfile | null
  name: string
}>()

const { t } = useI18n()
const { save, saving, saved, error, reset } = useSaveRoute()

const onClick = () => {
  if (!props.elevationProfile) return
  save({ name: props.name, route: props.route, elevationProfile: props.elevationProfile })
}

// A different route (switched alternative, or a fresh search) shouldn't
// keep showing "Saved" for what's no longer selected.
watch(() => props.route, reset)
</script>
