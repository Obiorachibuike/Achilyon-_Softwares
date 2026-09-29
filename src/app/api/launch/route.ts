import type { NextRequest } from 'next/server'
import { randomBytes } from 'node:crypto'
import { ApiError, guard, ok, parseBody, route } from '@/lib/api/http'
import { launchRequestSchema } from '@/lib/api/schemas'
import { NETWORKS, tokenKey } from '@/lib/blockchain/chains'
import { sanitizeSingleLine, sanitizeText, safeUrl } from '@/lib/security/sanitize'
import { getEngine } from '@/services/demo/engine'
import { getRepositories } from '@/services/db/repositories'

/**
 * POST /api/launch — creates a token on an Achilyon bonding curve.
 *
 * Only the demo wallet can launch: no factory contract is deployed yet, so a
 * real-wallet launch would have to be faked. `guard({ auth: 'demo' })`
 * returns 501 NOT_CONFIGURED for real wallets.
 */
export const POST = route(async (req: NextRequest) => {
  const session = await guard(req, { auth: 'demo', rate: 'launch' })
  const { info, economics, settings } = await parseBody(req, launchRequestSchema)
  const repo = getRepositories()
  const engine = getEngine()
  const symbolTaken = engine.list().some((t) => t.token.chain === settings.chain && t.token.symbol === info.symbol && t.token.launchpad && Date.now() - t.token.createdAt < 86_400_000)
  if (symbolTaken) throw new ApiError(409, 'SYMBOL_TAKEN', `${info.symbol} was launched on this network in the last 24h — choose another ticker`)
  if (settings.initialBuyQuote > 0) {
    const costUsd = settings.initialBuyQuote * NETWORKS[settings.chain].curveQuote.usdReference
    const { cashUsd } = engine.demoBalance(session.address, '')
    if (costUsd > cashUsd + 1e-9) throw new ApiError(400, 'INSUFFICIENT_BALANCE', 'Your demo balance cannot cover the initial buy')
  }
  const { token, hash, initialBuy } = engine.createLaunch({
    chain: settings.chain,
    name: sanitizeSingleLine(info.name, 32),
    symbol: info.symbol,
    description: sanitizeText(info.description, 500),
    logoUrl: info.logoDataUrl ?? null,
    socials: { website: safeUrl(info.website), twitter: safeUrl(info.twitter), telegram: safeUrl(info.telegram), discord: safeUrl(info.discord) },
    creator: session.address,
    totalSupply: economics.totalSupply,
    decimals: economics.decimals,
    curveAllocationPct: economics.curveAllocationPct,
    initialBuyQuote: settings.initialBuyQuote,
  })
  const key = tokenKey(token.token.chain, token.token.address)
  engine.recordLaunch(session.address, token, hash)
  if (initialBuy) engine.creditPosition(session.address, key, initialBuy)
  repo.users.touch(session.address, session.role)
  repo.users.incrementCreated(session.address)
  repo.notifications.push(session.address, {
    id: randomBytes(6).toString('hex'), kind: 'launch', title: `${token.token.symbol} launched`, body: 'Your token is live on its bonding curve (demo).',
    href: `/token/${token.token.chain}/${token.token.address}`, createdAt: Date.now(), read: false,
  })
  return ok({ token: engine.get(key) ?? token, hash, initialBuy, simulated: true }, { status: 201 })
})
