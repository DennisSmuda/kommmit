import type { ElevationProfile, LatLng } from '#shared/entities/routing'
import { errorMessage } from '#shared/api'

/** Fetches the elevation profile for `path`, refetching whenever it points at a different route. */
export function useElevationProfile(path: Ref<LatLng[] | null>) {
  const { t } = useI18n()

  const profile = ref<ElevationProfile | null>(null)
  const pending = ref(false)
  const error = ref('')

  watch(
    path,
    async (currentPath) => {
      profile.value = null
      error.value = ''

      if (!currentPath || currentPath.length === 0) return

      pending.value = true
      try {
        profile.value = await $fetch<ElevationProfile>('/api/routing/elevation', {
          method: 'POST',
          body: { path: currentPath },
        })
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
