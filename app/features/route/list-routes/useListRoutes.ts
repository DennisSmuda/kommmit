import type { ListSavedRoutesResult, SavedRouteSummary } from '#shared/entities/routing'
import { errorMessage } from '#shared/api'

export function useListRoutes() {
  const { t } = useI18n()
  // Plain $fetch drops the incoming request's cookies during SSR, so the
  // very first render would 401. useRequestFetch forwards them and behaves
  // like $fetch on the client.
  const fetch = useRequestFetch()

  const routes = ref<SavedRouteSummary[]>([])
  const pending = ref(false)
  const error = ref('')

  const load = async () => {
    pending.value = true
    error.value = ''

    try {
      const result = await fetch<ListSavedRoutesResult>('/api/routing/saved-routes')
      routes.value = result.routes
    } catch (e) {
      error.value = t(errorMessage(e, 'errors.loadSavedRoutesFailed'))
    } finally {
      pending.value = false
    }
  }

  return { routes, pending, error, load }
}
