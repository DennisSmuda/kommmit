import type { ElevationProfile, LatLng } from '#shared/entities/routing'
import { errorMessage } from '#shared/api'

/** Fetches the elevation profile for `path`, refetching whenever it points at a different route. */
export function useElevationProfile(path: Ref<LatLng[] | null>) {
  const { t } = useI18n()

  const profile = ref<ElevationProfile | null>(null)
  const pending = ref(false)
  const error = ref('')

  // Keyed by path, scoped to this composable instance: switching between
  // already-fetched route alternatives (e.g. toggling back and forth) reuses
  // the profile instead of re-hitting the API.
  const cache = new Map<string, ElevationProfile>()

  watch(
    path,
    async (currentPath) => {
      error.value = ''

      if (!currentPath || currentPath.length === 0) {
        profile.value = null
        return
      }

      const key = JSON.stringify(currentPath)
      const cached = cache.get(key)
      if (cached) {
        profile.value = cached
        return
      }

      profile.value = null
      pending.value = true
      try {
        const result = await $fetch<ElevationProfile>('/api/routing/elevation', {
          method: 'POST',
          body: { path: currentPath },
        })
        cache.set(key, result)
        profile.value = result
      } catch (e) {
        error.value = t(errorMessage(e, 'errors.elevationUnavailable'))
      } finally {
        pending.value = false
      }
    },
    { immediate: true },
  )

  return { profile, pending, error }
}
