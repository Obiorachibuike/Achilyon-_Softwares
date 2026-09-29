import type { NextRequest } from 'next/server'
import { guard, ok, parseQuery, route } from '@/lib/api/http'
import { listQuerySchema } from '@/lib/api/schemas'
import { listTokens } from '@/lib/blockchain/tokens'
import { paginate } from '@/lib/market/sorting'

/** GET /api/pairs?chain=&page=&pageSize= — trading pairs, newest first. */
export const GET = route(async (req: NextRequest) => {
  await guard(req)
  const q = parseQuery(req, listQuerySchema)
  const pairs = (await listTokens())
    .map((t) => t.pair)
    .filter((p) => q.chain === 'all' || p.chain === q.chain)
    .sort((a, b) => b.createdAt - a.createdAt)
  const page = paginate(pairs, q.page, q.pageSize)
  return ok({ items: page.items, total: page.total, page: page.page, pageSize: q.pageSize }, { cache: 'public, s-maxage=5, stale-while-revalidate=30' })
})
