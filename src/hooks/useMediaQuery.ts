'use client'
import { useCallback, useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query. Returns `false` during SSR. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', cb)
    return () => mql.removeEventListener('change', cb)
  }, [query])
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}
