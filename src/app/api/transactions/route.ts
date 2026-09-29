import type { NextRequest } from 'next/server'
import { guard, ok, route } from '@/lib/api/http'
import { getWalletTransactions } from '@/lib/blockchain/transactions'

/** GET /api/transactions — the signed-in wallet's activity. */
export const GET = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'user' })
  const { items, indexed } = await getWalletTransactions(session.address, session.demo)
  return ok(items, { meta: { indexed, source: session.demo ? 'demo' : 'live' } })
})
