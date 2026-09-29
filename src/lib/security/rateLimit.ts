/**
 * Fixed-window rate limiter. The in-memory store works for a single instance
 * and local development; implement `RateLimitStore` with Redis/Upstash for
 * multi-instance deployments.
 */

export interface RateLimitStore {
  hit(key: string, windowMs: number, now: number): { count: number; resetAt: number }
}

export class MemoryRateLimitStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>()

  hit(key: string, windowMs: number, now: number) {
    const b = this.buckets.get(key)
    if (!b || b.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs }
      this.buckets.set(key, fresh)
      if (this.buckets.size > 10_000) this.sweep(now)
      return fresh
    }
    b.count += 1
    return b
  }

  private sweep(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k)
  }
}

export interface RateLimitRule {
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(store: RateLimitStore, key: string, rule: RateLimitRule, now = Date.now()): RateLimitResult {
  const { count, resetAt } = store.hit(key, rule.windowMs, now)
  return { allowed: count <= rule.limit, remaining: Math.max(0, rule.limit - count), resetAt }
}

export const RATE_LIMITS = {
  read: { limit: 120, windowMs: 60_000 },
  search: { limit: 60, windowMs: 60_000 },
  write: { limit: 20, windowMs: 60_000 },
  auth: { limit: 10, windowMs: 60_000 },
  launch: { limit: 5, windowMs: 10 * 60_000 },
} satisfies Record<string, RateLimitRule>
