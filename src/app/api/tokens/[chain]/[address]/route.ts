import type { NextRequest } from 'next/server'
import { ApiError, guard, ok, route } from '@/lib/api/http'
import { tokenParams } from '@/lib/api/params'
import { getToken } from '@/lib/blockchain/tokens'
import { getTokenPairs } from '@/lib/blockchain/pairs'

type Ctx = { params: Promise<{ chain: string; address: string }> }

/** GET /api/tokens/:chain/:address — token, market data, curve and pools. */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  await guard(req)
  const { chain, address } = await tokenParams(params)
  const token = await getToken(chain, address)
  if (!token) throw new ApiError(404, 'TOKEN_NOT_FOUND', 'Token not found')
  const pairs = await getTokenPairs(chain, address).catch(() => [token.pair])
  return ok({ token, pairs }, { cache: 'public, s-maxage=3, stale-while-revalidate=20' })
})
