<template>
  <Navigation />
</template>

<script setup lang="ts">
import { Navigation } from '~/widgets/navigation'
import { useActiveNavigationRoute } from '~/features/route/navigate'

definePageMeta({
  middleware: [
    'auth',
    () => {
      const { activeRoute } = useActiveNavigationRoute()
      if (!activeRoute.value) return navigateTo('/')
    },
  ],
})

const { t } = useI18n()

useSeoMeta({
  title: () => t('meta.title.navigate'),
})
</script>
