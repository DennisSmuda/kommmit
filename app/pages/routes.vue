<template>
  <SavedRoutesList />
</template>

<script setup lang="ts">
import { SavedRoutesList } from '~/widgets/saved-routes'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()

useSeoMeta({
  title: () => t('meta.title.routes'),
})
</script>
