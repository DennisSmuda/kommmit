import type { ElevationProfile, RouteResult } from '#shared/entities/routing'
import { errorMessage } from '#shared/api'

export function useSaveRoute() {
  const { t } = useI18n()

  const saving = ref(false)
  const saved = ref(false)
  const error = ref('')

  const reset = () => {
    saved.value = false
    error.value = ''
  }

  const save = async (params: {
    name: string
    originLabel: string
    destinationLabel: string
    route: RouteResult
    elevationProfile: ElevationProfile
  }) => {
    saving.value = true
    error.value = ''

    try {
      await $fetch('/api/routing/saved-routes', {
        method: 'POST',
        body: {
          name: params.name,
          originLabel: params.originLabel,
          destinationLabel: params.destinationLabel,
          route: {
            kind: params.route.kind,
            distanceMeters: params.route.distanceMeters,
            durationSeconds: params.route.durationSeconds,
          },
          elevationProfile: params.elevationProfile,
        },
      })
      saved.value = true
    } catch (e) {
      error.value = t(errorMessage(e, 'errors.saveRouteFailed'))
    } finally {
      saving.value = false
    }
  }

  return { save, saving, saved, error, reset }
}
