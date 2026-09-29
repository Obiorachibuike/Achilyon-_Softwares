import type { NextRequest } from 'next/server'
import { guard, ok, route } from '@/lib/api/http'
import { tokenParams } from '@/lib/api/params'
import { tokenKey } from '@/lib/blockchain/chains'
import { getRepositories } from '@/services/db/repositories'

type Ctx = { params: Promise<{ chain: string; address: string }> }

/** DELETE /api/watchlist/:chain/:address */
export const DELETE = route<Ctx>(async (req: NextRequest, { params }) => {
  const session = await guard(req, { auth: 'user' })
  const { chain, address } = await tokenParams(params)
  const repo = getRepositories()
  repo.watchlists.remove(session.address, tokenKey(chain, address))
  return ok(repo.watchlists.list(session.address))
})
