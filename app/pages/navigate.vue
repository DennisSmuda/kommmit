<template>
  <Navigation />
</template>

<script setup lang="ts">
import { Navigation } from '~/widgets/navigation'
import { useActiveNavigationRoute } from '~/features/route/navigate'

definePageMeta({
  middleware: [
    'auth',
    // A routeId query param makes this URL shareable/bookmarkable: the
    // widget resolves it client-side, so only bail out here when there's
    // neither an in-memory route nor an id to resolve one from.
    (to) => {
      const { activeRoute } = useActiveNavigationRoute()
      if (!activeRoute.value && typeof to.query.routeId !== 'string') {
        return navigateTo('/')
      }
    },
  ],
})

const { t } = useI18n()

useSeoMeta({
  title: () => t('meta.title.navigate'),
})
</script>
