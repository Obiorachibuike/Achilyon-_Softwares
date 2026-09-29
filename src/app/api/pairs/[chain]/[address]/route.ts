import type { NextRequest } from 'next/server'
import { ApiError, guard, ok, route } from '@/lib/api/http'
import { tokenParams } from '@/lib/api/params'
import { getPair } from '@/lib/blockchain/pairs'

type Ctx = { params: Promise<{ chain: string; address: string }> }

/** GET /api/pairs/:chain/:pairAddress — resolves a pair to its token market. */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  await guard(req)
  const { chain, address } = await tokenParams(params)
  const token = await getPair(chain, address)
  if (!token) throw new ApiError(404, 'PAIR_NOT_FOUND', 'Pair not found')
  return ok(token)
})
