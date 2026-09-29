import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ApiError, guard, ok, parseQuery, route } from '@/lib/api/http'
import { tokenParams } from '@/lib/api/params'
import { getToken } from '@/lib/blockchain/tokens'
import { getTransactions } from '@/lib/blockchain/transactions'

type Ctx = { params: Promise<{ chain: string; address: string }> }

/** GET /api/tokens/:chain/:address/trades?limit=50 */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  await guard(req)
  const { chain, address } = await tokenParams(params)
  const { limit } = parseQuery(req, z.object({ limit: z.coerce.number().int().min(1).max(100).default(50) }))
  const token = await getToken(chain, address)
  if (!token) throw new ApiError(404, 'TOKEN_NOT_FOUND', 'Token not found')
  return ok(await getTransactions(token, limit), { meta: { source: token.source } })
})
