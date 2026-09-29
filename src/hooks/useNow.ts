'use client'
import { useEffect, useState } from 'react'

/** Re-renders every `interval` ms so relative times ("3m ago") stay fresh. */
export function useNow(interval = 15_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}
