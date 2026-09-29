import type { NextRequest } from 'next/server'
import { guard, ok, route } from '@/lib/api/http'
import { destroySession } from '@/services/auth/session'

/** POST /api/auth/logout */
export const POST = route(async (req: NextRequest) => {
  await guard(req, { rate: 'auth' })
  await destroySession()
  return ok({ signedOut: true })
})
