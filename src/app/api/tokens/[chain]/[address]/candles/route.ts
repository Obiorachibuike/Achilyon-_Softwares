import type { NextRequest } from 'next/server'
import { ApiError, guard, ok, parseQuery, route } from '@/lib/api/http'
import { tokenParams } from '@/lib/api/params'
import { timeframeSchema } from '@/lib/api/schemas'
import { getToken } from '@/lib/blockchain/tokens'
import { getCandles } from '@/lib/blockchain/pairs'
import { z } from 'zod'

type Ctx = { params: Promise<{ chain: string; address: string }> }

/** GET /api/tokens/:chain/:address/candles?tf=15m */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  await guard(req)
  const { chain, address } = await tokenParams(params)
  const { tf } = parseQuery(req, z.object({ tf: timeframeSchema.default('15m') }))
  const token = await getToken(chain, address)
  if (!token) throw new ApiError(404, 'TOKEN_NOT_FOUND', 'Token not found')
  const candles = await getCandles(token, tf)
  return ok(candles, { meta: { source: token.source, timeframe: tf }, cache: 'public, s-maxage=10, stale-while-revalidate=60' })
})
