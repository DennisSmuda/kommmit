import type {
  RouteRequestPoint,
  RouteResult,
  RouteSearchResult,
} from '#shared/entities/routing'
import { errorMessage } from '#shared/api'

export function useFindRoute() {
  const { t } = useI18n()

  const routes = ref<RouteResult[]>([])
  const selectedIndex = ref(0)
  const pending = ref(false)
  const error = ref('')

  const selectedRoute = computed(() => routes.value[selectedIndex.value] ?? null)

  const submit = async (origin: RouteRequestPoint, destination: RouteRequestPoint) => {
    pending.value = true
    error.value = ''
    routes.value = []
    selectedIndex.value = 0

    try {
      const result = await $fetch<RouteSearchResult>('/api/routing/find-route', {
        method: 'POST',
        body: { origin, destination },
      })
      routes.value = result.routes
    } catch (e) {
      error.value = t(errorMessage(e, 'errors.routingServiceUnavailable'))
    } finally {
      pending.value = false
    }
  }

  return { routes, selectedIndex, selectedRoute, pending, error, submit }
}
