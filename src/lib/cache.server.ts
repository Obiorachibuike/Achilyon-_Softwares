import 'server-only'

/**
 * Tiny TTL cache with in-flight de-duplication and stale fallback
 * (stale-while-revalidate semantics): fresh values are served from memory,
 * expired values trigger a refresh, and if the refresh fails the last good
 * value is returned for up to `staleMs`.
 */
interface Entry<T> {
  value: T
  expiresAt: number
  staleUntil: number
}

const store = new Map<string, Entry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>, staleMs = ttlMs * 10): Promise<T> {
  const now = Date.now()
  const hit = store.get(key) as Entry<T> | undefined
  if (hit && hit.expiresAt > now) return hit.value
  const pending = inflight.get(key) as Promise<T> | undefined
  if (pending) return hit ? hit.value : pending
  const run = fn()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs, staleUntil: Date.now() + ttlMs + staleMs })
      if (store.size > 2000) {
        for (const [k, v] of store) if (v.staleUntil < Date.now()) store.delete(k)
      }
      return value
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, run)
  if (hit && hit.staleUntil > now) {
    run.catch(() => undefined)
    return hit.value
  }
  return run
}
