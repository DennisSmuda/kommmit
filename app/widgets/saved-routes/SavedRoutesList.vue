<template>
  <div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
    <header class="mb-6 flex items-center justify-between">
      <h1 class="font-display text-2xl font-bold tracking-tight text-highlighted">
        {{ t('savedRoutes.title') }}
      </h1>
      <UButton
        to="/"
        variant="ghost"
        color="neutral"
        icon="i-lucide-arrow-left"
      >
        {{ t('savedRoutes.backToMap') }}
      </UButton>
    </header>

    <p
      v-if="error"
      class="text-sm text-error"
    >
      {{ error }}
    </p>

    <div
      v-else-if="pending"
      class="space-y-3"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-20 w-full rounded-lg"
      />
    </div>

    <p
      v-else-if="routes.length === 0"
      class="text-sm text-muted"
    >
      {{ t('savedRoutes.empty') }}
    </p>

    <ul
      v-else
      class="space-y-3"
    >
      <li
        v-for="route in routes"
        :key="route.id"
      >
        <UCard>
          <div class="flex items-center justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate font-medium text-highlighted">
                {{ route.name }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ route.originLabel }} → {{ route.destinationLabel }}
              </p>
              <p class="text-xs text-muted">
                {{ kindLabel(route.kind) }} ·
                {{ t('savedRoutes.savedOn', { date: formatDate(route.createdAt) }) }}
              </p>
            </div>
            <div class="shrink-0 text-right text-sm text-toned">
              <p>
                {{
                  t('routing.distance', {
                    distance: (route.distanceMeters / 1000).toFixed(1),
                  })
                }}
              </p>
              <p>
                {{
                  t('routing.duration', {
                    duration: Math.round(route.durationSeconds / 60),
                  })
                }}
              </p>
              <p class="text-xs text-muted">
                {{ t('routing.ascent', { value: Math.round(route.ascentMeters) }) }}
                {{ t('routing.descent', { value: Math.round(route.descentMeters) }) }}
              </p>
            </div>
          </div>
          <div class="mt-3 flex justify-end gap-2 border-t border-default pt-3">
            <UButton
              :to="{ path: '/', query: { routeId: route.id } }"
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-map"
            >
              {{ t('savedRoutes.view') }}
            </UButton>
            <UButton
              :href="`/api/routing/saved-routes/${route.id}/gpx`"
              external
              download
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-download"
            >
              {{ t('savedRoutes.exportGpx') }}
            </UButton>
          </div>
        </UCard>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { RouteKind } from '#shared/entities/routing'
import { useListRoutes } from '~/features/route/list-routes'

const { t, locale } = useI18n()
const { routes, pending, error, load } = useListRoutes()

const kindLabel = (kind: RouteKind) => {
  if (kind === 'recommended') return t('routing.recommended')
  if (kind === 'flattest') return t('routing.flattest')
  return t('routing.alternativeGeneric')
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString(locale.value)

await load()
</script>
