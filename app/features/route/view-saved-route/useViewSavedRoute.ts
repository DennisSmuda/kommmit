import type { SavedRouteDetail } from '#shared/entities/routing'
import { errorMessage } from '#shared/api'

export function useViewSavedRoute() {
  const { t } = useI18n()

  const detail = ref<SavedRouteDetail | null>(null)
  const pending = ref(false)
  const error = ref('')

  const load = async (id: string) => {
    pending.value = true
    error.value = ''

    try {
      detail.value = await $fetch<SavedRouteDetail>(`/api/routing/saved-routes/${id}`)
    } catch (e) {
      error.value = t(errorMessage(e, 'errors.loadSavedRouteFailed'))
    } finally {
      pending.value = false
    }
  }

  const clear = () => {
    detail.value = null
    error.value = ''
  }

  return { detail, pending, error, load, clear }
}
