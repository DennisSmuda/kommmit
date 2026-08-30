<template>
  <UButton
    type="button"
    block
    size="lg"
    :color="saved ? 'success' : 'neutral'"
    :variant="saved ? 'soft' : 'solid'"
    :icon="saved ? 'i-lucide-check' : undefined"
    :disabled="!elevationProfile"
    @click="onClick"
  >
    {{ saved ? t('routing.saved') : t('routing.save') }}
  </UButton>

  <UModal
    v-model:open="open"
    :title="t('routing.saveDialogTitle')"
  >
    <template #body>
      <UFormField :label="t('routing.saveDialogNameLabel')">
        <UInput
          v-model="name"
          autofocus
          class="w-full"
          @keydown.enter="onConfirm"
        />
      </UFormField>
      <p
        v-if="error"
        class="mt-2 text-xs text-error"
      >
        {{ error }}
      </p>
    </template>

    <template #footer>
      <UButton
        type="button"
        variant="ghost"
        color="neutral"
        @click="open = false"
      >
        {{ t('routing.saveDialogCancel') }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        :loading="saving"
        :disabled="!name.trim()"
        @click="onConfirm"
      >
        {{ t('routing.save') }}
      </UButton>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ElevationProfile, RouteResult } from '#shared/entities/routing'
import { useSaveRoute } from './useSaveRoute'

const props = defineProps<{
  route: RouteResult
  elevationProfile: ElevationProfile | null
  originLabel: string
  destinationLabel: string
}>()

const { t } = useI18n()
const { save, saving, saved, error, reset } = useSaveRoute()

const open = ref(false)
const name = ref('')

const onClick = () => {
  if (!props.elevationProfile || saved.value) return
  name.value = `${props.originLabel} → ${props.destinationLabel}`
  open.value = true
}

const onConfirm = async () => {
  if (!props.elevationProfile || !name.value.trim()) return
  await save({
    name: name.value.trim(),
    originLabel: props.originLabel,
    destinationLabel: props.destinationLabel,
    route: props.route,
    elevationProfile: props.elevationProfile,
  })
  if (!error.value) open.value = false
}

// A different route (switched alternative, or a fresh search) shouldn't
// keep showing "Saved" for what's no longer selected.
watch(() => props.route, reset)
</script>
