<template>
  <MapExplorer />
</template>

<script setup lang="ts">
import { MapExplorer } from '~/widgets/map-explorer'

definePageMeta({
  middleware: 'auth',
})

const { t } = useI18n()

useSeoMeta({
  title: () => t('meta.title.home'),
})
</script>
