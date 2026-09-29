import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { guard, ok, parseQuery, route } from '@/lib/api/http'
import { chainSchema } from '@/lib/api/schemas'
import { getPortfolio } from '@/lib/blockchain/wallets'
import { publicConfig } from '@/lib/config'

/** GET /api/portfolio?chain= — portfolio for the signed-in wallet. */
export const GET = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'user' })
  const { chain } = parseQuery(req, z.object({ chain: chainSchema.default(publicConfig.defaultChain) }))
  return ok(await getPortfolio(session.address, session.demo, chain))
})
