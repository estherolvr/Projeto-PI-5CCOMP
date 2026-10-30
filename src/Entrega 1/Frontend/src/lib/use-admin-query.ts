import { useCallback, useEffect, useRef, useState } from 'react'

/** Refresh the same persisted data used by the student and ASA portals. */
export function useAdminQuery<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const generation = useRef(0)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const request = ++generation.current
    try {
      const result = await loaderRef.current()
      if (request === generation.current) {
        setData(result)
        setError(null)
      }
    } catch (err) {
      if (request === generation.current) setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.')
    } finally {
      if (request === generation.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    void refresh()
    const refreshVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    const timer = window.setInterval(refreshVisible, 30_000)
    window.addEventListener('focus', refreshVisible)
    return () => {
      ++generation.current
      window.clearInterval(timer)
      window.removeEventListener('focus', refreshVisible)
    }
  }, [refresh, ...deps])

  return { data, loading, error, refresh }
}
