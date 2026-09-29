import type { NextRequest } from 'next/server'
import { guard, ok, parseQuery, route } from '@/lib/api/http'
import { searchQuerySchema } from '@/lib/api/schemas'
import { searchTokens } from '@/lib/blockchain/tokens'

/** GET /api/search?q= — tokens (name, ticker, address), pairs and creators. */
export const GET = route(async (req: NextRequest) => {
  await guard(req, { rate: 'search' })
  const { q } = parseQuery(req, searchQuerySchema)
  return ok(await searchTokens(q), { cache: 'public, s-maxage=10' })
})
