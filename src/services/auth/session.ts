import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import type { Role, Session } from '@/types'
import { serverEnv } from '@/lib/env.server'
import { DEMO_WALLET_ADDRESS, publicConfig } from '@/lib/config'

/**
 * Stateless signed sessions (HMAC-SHA256 over a base64url JSON payload).
 * Cookies are httpOnly, SameSite=Lax and Secure in production, so they are
 * not readable by scripts and are not sent on cross-site POSTs.
 */

export const SESSION_COOKIE = 'ach_session'
export const NONCE_COOKIE = 'ach_nonce'
const SESSION_TTL_MS = 7 * 24 * 3_600_000
const NONCE_TTL_MS = 5 * 60_000

const b64 = (s: string) => Buffer.from(s).toString('base64url')
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8')

function sign(payload: string): string {
  return createHmac('sha256', serverEnv().sessionSecret).update(payload).digest('base64url')
}

export function seal(data: object): string {
  const payload = b64(JSON.stringify(data))
  return `${payload}.${sign(payload)}`
}

export function unseal<T>(token: string | undefined): T | null {
  if (!token) return null
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    return JSON.parse(unb64(payload)) as T
  } catch {
    return null
  }
}

const cookieBase = () => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' })

export function roleFor(address: string, demo: boolean): Role {
  if (serverEnv().adminAddresses.includes(address.toLowerCase())) return 'admin'
  // In demo mode the demo wallet can open the moderation console so the
  // feature can be evaluated. This never applies when demo mode is off.
  if (demo && publicConfig.demoMode && address.toLowerCase() === DEMO_WALLET_ADDRESS.toLowerCase()) return 'admin'
  return 'user'
}

export async function createSession(address: string, demo: boolean): Promise<Session> {
  const now = Date.now()
  const session: Session = { address, role: roleFor(address, demo), demo, issuedAt: now, expiresAt: now + SESSION_TTL_MS }
  const jar = await cookies()
  jar.set(SESSION_COOKIE, seal(session), { ...cookieBase(), maxAge: SESSION_TTL_MS / 1000 })
  return session
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies()
  const s = unseal<Session>(jar.get(SESSION_COOKIE)?.value)
  if (!s || s.expiresAt < Date.now()) return null
  if (s.demo && !publicConfig.demoMode) return null
  return s
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function issueNonce(): Promise<string> {
  const nonce = randomBytes(16).toString('hex')
  const jar = await cookies()
  jar.set(NONCE_COOKIE, seal({ nonce, exp: Date.now() + NONCE_TTL_MS }), { ...cookieBase(), maxAge: NONCE_TTL_MS / 1000 })
  return nonce
}

/** Returns the pending nonce and clears it (single use). */
export async function consumeNonce(): Promise<string | null> {
  const jar = await cookies()
  const data = unseal<{ nonce: string; exp: number }>(jar.get(NONCE_COOKIE)?.value)
  jar.delete(NONCE_COOKIE)
  return data && data.exp > Date.now() ? data.nonce : null
}
