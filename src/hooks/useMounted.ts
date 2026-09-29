'use client'
import { useSyncExternalStore } from 'react'

const noop = () => () => {}

/** True after hydration — use to guard localStorage-backed UI and avoid mismatches. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false)
}
