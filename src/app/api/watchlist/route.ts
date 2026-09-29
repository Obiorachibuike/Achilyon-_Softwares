import type { NextRequest } from 'next/server'
import { guard, ok, parseBody, route } from '@/lib/api/http'
import { watchlistAddSchema } from '@/lib/api/schemas'
import { normalizeAddress } from '@/lib/blockchain/chains'
import { getRepositories } from '@/services/db/repositories'

/** GET /api/watchlist — server-side watchlist for the signed-in wallet. */
export const GET = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'user' })
  return ok(getRepositories().watchlists.list(session.address))
})

/** POST /api/watchlist { chain, address } */
export const POST = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'user' })
  const { chain, address } = await parseBody(req, watchlistAddSchema)
  const repo = getRepositories()
  if (repo.watchlists.list(session.address).length >= 200) return ok(repo.watchlists.list(session.address), { status: 200, meta: { capped: true } })
  repo.watchlists.add(session.address, { chain, address: normalizeAddress(chain, address), addedAt: Date.now() })
  return ok(repo.watchlists.list(session.address), { status: 201 })
})
