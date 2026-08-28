<template>
  <div class="relative h-screen w-screen">
    <ClientOnly>
      <MapCanvas />
    </ClientOnly>

    <header
      class="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4"
    >
      <p
        class="pointer-events-auto rounded-lg bg-default/90 backdrop-blur px-3 py-1.5 shadow font-display text-xl font-bold tracking-tight text-highlighted"
      >
        {{ t('meta.title.home') }}
      </p>
      <div class="pointer-events-auto rounded-lg bg-default/90 backdrop-blur shadow">
        <SignOutButton />
      </div>
    </header>
  </div>
</template>

<script setup lang="ts">
import { MapCanvas } from '~/entities/map'
import { SignOutButton } from '~/features/user/sign-out'

const { t } = useI18n()
</script>
