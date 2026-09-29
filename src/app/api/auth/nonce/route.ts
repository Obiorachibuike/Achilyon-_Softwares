import type { NextRequest } from 'next/server'
import { guard, ok, route } from '@/lib/api/http'
import { issueNonce } from '@/services/auth/session'

/** GET /api/auth/nonce — single-use nonce for wallet sign-in (stored in an httpOnly cookie). */
export const GET = route(async (req: NextRequest) => {
  await guard(req, { rate: 'auth' })
  return ok({ nonce: await issueNonce() })
})
