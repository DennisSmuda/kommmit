import type { RouteResult } from '#shared/entities/routing'

export interface ActiveNavigationRoute {
  route: RouteResult
  originLabel: string
  destinationLabel: string
}

// SPA client state, not SSR data — /navigate has nothing to render without a
// route already chosen on the map page, so a direct hit or reload finds this
// empty and bounces back rather than fetching anything.
export function useActiveNavigationRoute() {
  const activeRoute = useState<ActiveNavigationRoute | null>(
    'active-navigation-route',
    () => null,
  )

  const set = (value: ActiveNavigationRoute) => {
    activeRoute.value = value
  }

  const clear = () => {
    activeRoute.value = null
  }

  return { activeRoute, set, clear }
}
