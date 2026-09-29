import type { NextRequest } from 'next/server'
import { ApiError, guard, ok, parseBody, route } from '@/lib/api/http'
import { tradeRequestSchema } from '@/lib/api/schemas'
import { tokenKey } from '@/lib/blockchain/chains'
import { getEngine } from '@/services/demo/engine'

/**
 * POST /api/trade — settles a demo-wallet trade against the simulated
 * market (bonding curve or x·y=k pool) with an on-chain-style min-out check.
 * Real-wallet swaps are signed client-side against a router contract and are
 * not routed through this endpoint (501 until a router is configured).
 */
export const POST = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'demo' })
  const body = await parseBody(req, tradeRequestSchema)
  const key = tokenKey(body.chain, body.address)
  const engine = getEngine()
  if (!engine.get(key)) throw new ApiError(404, 'TOKEN_NOT_FOUND', 'This token is not tradable in demo mode')
  try {
    const result = engine.demoTrade(session.address, key, body.side, body.amount, body.slippageBps)
    return ok({ ...result, simulated: true, balance: engine.demoBalance(session.address, key) })
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new ApiError(400, 'TRADE_FAILED', e instanceof Error ? e.message : 'Trade failed')
  }
})

/** GET /api/trade?chain=&address= — demo balances for the trading panel. */
export const GET = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'demo' })
  const params = new URL(req.url).searchParams
  const chain = params.get('chain')
  const address = params.get('address')
  const parsed = tradeRequestSchema.pick({ chain: true, address: true }).parse({ chain, address })
  return ok(getEngine().demoBalance(session.address, tokenKey(parsed.chain, parsed.address)))
})
