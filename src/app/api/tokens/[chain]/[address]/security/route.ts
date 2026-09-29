import type { NextRequest } from 'next/server'
import { ApiError, guard, ok, route } from '@/lib/api/http'
import { tokenParams } from '@/lib/api/params'
import { NETWORKS } from '@/lib/blockchain/chains'
import { evmSecurityChecks, scoreChecks, solanaSecurityChecks } from '@/lib/market/security'
import { goplus } from '@/services/providers/goplus'
import { getToken } from '@/lib/blockchain/tokens'

type Ctx = { params: Promise<{ chain: string; address: string }> }

/**
 * GET /api/tokens/:chain/:address/security — contract checks via GoPlus.
 * Demo tokens don't exist on-chain, so no contract scan is possible.
 */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  await guard(req, { rate: 'search' })
  const { chain, address } = await tokenParams(params)
  const token = await getToken(chain, address)
  if (token?.source === 'demo') return ok({ available: false, reason: 'Demo tokens are not deployed on-chain, so no contract scan is possible.', checks: [], score: null })
  if (!goplus.isSupported(chain)) throw new ApiError(404, 'UNSUPPORTED', 'Security scans are not available for this network')
  const record = await goplus.tokenSecurity(chain, address)
  if (!record) return ok({ available: false, reason: 'The security provider has no data for this contract yet.', checks: [], score: null })
  const checks = NETWORKS[chain].kind === 'solana' ? solanaSecurityChecks(record) : evmSecurityChecks(record)
  return ok({ available: true, reason: null, checks, score: scoreChecks(checks) }, { cache: 'public, s-maxage=300' })
})
