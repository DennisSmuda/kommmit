<script setup lang="ts">
import * as locales from '@nuxt/ui/locale'

const { locale } = useI18n()

useHead({
  titleTemplate: (title) => (title ? `${title} · kommmit` : 'kommmit'),
})
</script>

<template>
  <UApp :locale="locales[locale]">
    <NuxtPage />
  </UApp>
</template>
