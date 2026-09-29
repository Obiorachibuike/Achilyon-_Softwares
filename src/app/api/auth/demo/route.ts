import type { NextRequest } from 'next/server'
import { ApiError, guard, ok, route } from '@/lib/api/http'
import { DEMO_WALLET_ADDRESS, publicConfig } from '@/lib/config'
import { createSession } from '@/services/auth/session'
import { getRepositories } from '@/services/db/repositories'

/**
 * POST /api/auth/demo — signs in the shared demo wallet. Only available when
 * demo mode is on; the demo wallet has no private key and no real funds.
 */
export const POST = route(async (req: NextRequest) => {
  await guard(req, { rate: 'auth' })
  if (!publicConfig.demoMode) throw new ApiError(404, 'NOT_AVAILABLE', 'Demo wallet is disabled')
  const session = await createSession(DEMO_WALLET_ADDRESS, true)
  getRepositories().users.touch(DEMO_WALLET_ADDRESS, session.role)
  return ok(session)
})
