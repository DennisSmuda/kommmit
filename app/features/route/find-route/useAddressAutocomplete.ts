import type { GeocodeCandidate } from '#shared/entities/routing'
import { errorMessage } from '#shared/api'

const DEBOUNCE_MS = 300

export function useAddressAutocomplete() {
  const { t } = useI18n()

  const query = ref('')
  const candidates = ref<GeocodeCandidate[]>([])
  const pending = ref(false)
  const error = ref('')

  let timer: ReturnType<typeof setTimeout> | undefined

  const search = (q: string) => {
    clearTimeout(timer)

    if (q.trim().length < 3) {
      candidates.value = []
      return
    }

    timer = setTimeout(async () => {
      pending.value = true
      error.value = ''

      try {
        const result = await $fetch<{ candidates: GeocodeCandidate[] }>(
          '/api/routing/geocode',
          {
            query: { q },
          },
        )
        candidates.value = result.candidates
      } catch (e) {
        error.value = t(errorMessage(e, 'errors.geocodingUnavailable'))
      } finally {
        pending.value = false
      }
    }, DEBOUNCE_MS)
  }

  watch(query, search)
  onScopeDispose(() => clearTimeout(timer))

  return { query, candidates, pending, error }
}
