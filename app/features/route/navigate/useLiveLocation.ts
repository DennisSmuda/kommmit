import type { LatLng } from '#shared/entities/routing'

export interface LiveLocation {
  position: LatLng
  headingDegrees: number | null
  speedMetersPerSecond: number | null
}

export function useLiveLocation() {
  const { t } = useI18n()

  const location = ref<LiveLocation | null>(null)
  const error = ref('')
  const supported = import.meta.client && 'geolocation' in navigator

  let watchId: number | undefined

  const onPosition = (position: GeolocationPosition) => {
    location.value = {
      position: { lat: position.coords.latitude, lng: position.coords.longitude },
      headingDegrees: position.coords.heading,
      speedMetersPerSecond: position.coords.speed,
    }
    error.value = ''
  }

  const onError = (e: GeolocationPositionError) => {
    error.value = t(
      e.code === e.PERMISSION_DENIED
        ? 'errors.geolocationDenied'
        : 'errors.geolocationUnavailable',
    )
  }

  const start = () => {
    if (!supported) {
      error.value = t('errors.geolocationUnsupported')
      return
    }
    watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 15_000,
    })
  }

  const stop = () => {
    if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
    watchId = undefined
  }

  onScopeDispose(stop)

  return { location, error, supported, start, stop }
}
