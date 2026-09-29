import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { ZodError, type ZodType } from 'zod'
import type { ApiFailure, ApiSuccess, Session } from '@/types'
import { CurveError } from '@/lib/bondingCurve'
import { checkRateLimit, MemoryRateLimitStore, RATE_LIMITS } from '@/lib/security/rateLimit'
import { ProviderError } from '@/services/providers/types'
import { getSession } from '@/services/auth/session'

/**
 * Route-handler toolkit: consistent envelopes, error mapping, rate limiting,
 * CSRF (Origin) checks, auth/role guards and body validation.
 */

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly details?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export function ok<T>(data: T, init?: { meta?: Record<string, unknown>; cache?: string; status?: number }) {
  const body: ApiSuccess<T> = { ok: true, data, ...(init?.meta ? { meta: init.meta } : {}) }
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { 'cache-control': init?.cache ?? 'no-store' },
  })
}

export function fail(status: number, code: string, message: string, details?: unknown, headers?: Record<string, string>) {
  const body: ApiFailure = { ok: false, error: { code, message, ...(details !== undefined ? { details } : {}) } }
  return NextResponse.json(body, { status, headers: { 'cache-control': 'no-store', ...headers } })
}

const g = globalThis as unknown as { __achilyonRate?: MemoryRateLimitStore }
const rateStore = (g.__achilyonRate ??= new MemoryRateLimitStore())

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

type RuleName = keyof typeof RATE_LIMITS

export interface GuardOptions {
  rate?: RuleName
  auth?: 'user' | 'admin' | 'demo'
  /** Enforce same-origin for state-changing requests (default: true for non-GET). */
  csrf?: boolean
}

function assertSameOrigin(req: NextRequest) {
  const origin = req.headers.get('origin')
  const site = req.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin' && site !== 'none') throw new ApiError(403, 'CSRF', 'Cross-site request blocked')
  if (origin) {
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
    let originHost = ''
    try { originHost = new URL(origin).host } catch { /* invalid origin */ }
    if (!host || originHost !== host) throw new ApiError(403, 'CSRF', 'Cross-origin request blocked')
  }
}

/** Runs rate limit, CSRF and auth checks. Returns the session when auth is required. */
export async function guard(req: NextRequest, opts: GuardOptions & { auth: 'user' | 'admin' | 'demo' }): Promise<Session>
export async function guard(req: NextRequest, opts?: GuardOptions): Promise<Session | null>
export async function guard(req: NextRequest, opts: GuardOptions = {}): Promise<Session | null> {
  const rule = RATE_LIMITS[opts.rate ?? (req.method === 'GET' ? 'read' : 'write')]
  const rl = checkRateLimit(rateStore, `${opts.rate ?? req.method}:${new URL(req.url).pathname}:${clientIp(req)}`, rule)
  if (!rl.allowed) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests — slow down and try again shortly', { resetAt: rl.resetAt })
  if (opts.csrf ?? req.method !== 'GET') assertSameOrigin(req)
  const session = await getSession()
  if (opts.auth) {
    if (!session) throw new ApiError(401, 'UNAUTHENTICATED', 'Connect and sign in with your wallet first')
    if (opts.auth === 'admin' && session.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Admin access required')
    if (opts.auth === 'demo' && !session.demo) throw new ApiError(501, 'NOT_CONFIGURED', 'On-chain execution is not configured for real wallets yet. Switch to the demo wallet to try this flow.')
  }
  return session
}

const MAX_BODY_BYTES = 512 * 1024

export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const len = Number(req.headers.get('content-length') ?? 0)
  if (len > MAX_BODY_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large')
  let json: unknown
  try {
    json = await req.json()
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON')
  }
  return schema.parse(json)
}

export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  return schema.parse(Object.fromEntries(new URL(req.url).searchParams))
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>

/** Wraps a handler with uniform error mapping. Internal errors never leak details. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.code, e.message, e.details, e.status === 429 ? { 'retry-after': '30' } : undefined)
      if (e instanceof ZodError) return fail(400, 'VALIDATION_ERROR', e.issues[0]?.message ?? 'Invalid request', e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })))
      if (e instanceof CurveError) return fail(400, e.code, e.message)
      if (e instanceof ProviderError) return fail(e.status === 404 ? 404 : e.status === 429 ? 429 : 502, e.status === 429 ? 'RATE_LIMITED' : 'PROVIDER_ERROR', e.message)
      console.error('[api]', req.method, new URL(req.url).pathname, e)
      return fail(500, 'INTERNAL_ERROR', 'Something went wrong on our side')
    }
  }
}
