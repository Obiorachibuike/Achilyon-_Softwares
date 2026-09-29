import type { NextRequest } from 'next/server'
import { guard, ok, route } from '@/lib/api/http'
import { getRepositories } from '@/services/db/repositories'

/** GET /api/notifications — server notifications for the signed-in wallet. */
export const GET = route(async (req: NextRequest) => {
  const session = await guard(req)
  return ok(session ? getRepositories().notifications.list(session.address) : [])
})

/** POST /api/notifications — mark all as read. */
export const POST = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'user' })
  getRepositories().notifications.markAllRead(session.address)
  return ok({ done: true })
})
