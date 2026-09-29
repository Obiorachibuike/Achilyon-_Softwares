import type { NextRequest } from 'next/server'
import { ApiError, guard, ok, route } from '@/lib/api/http'
import { addressSchema } from '@/lib/api/schemas'
import { listTokens } from '@/lib/blockchain/tokens'
import { getRepositories } from '@/services/db/repositories'
import { getEngine } from '@/services/demo/engine'
import { DEMO_WALLET_ADDRESS } from '@/lib/config'

type Ctx = { params: Promise<{ address: string }> }

/**
 * GET /api/profile/:address — public profile. Privacy-conscious: only
 * activity that is already public on Achilyon (created tokens, comments,
 * reputation) is returned; balances are never exposed for other users.
 */
export const GET = route<Ctx>(async (req: NextRequest, { params }) => {
  const session = await guard(req)
  const parsed = addressSchema.safeParse((await params).address)
  if (!parsed.success) throw new ApiError(400, 'INVALID_ADDRESS', 'Invalid address')
  const address = parsed.data
  const lc = address.toLowerCase()
  const repo = getRepositories()
  const tokens = await listTokens()
  const created = tokens.filter((t) => t.token.creator?.toLowerCase() === lc)
  const comments = repo.comments.byAuthor(address).filter((c) => c.status === 'visible')
  const user = repo.users.get(address)
  const isSelf = session?.address.toLowerCase() === lc
  const isDemo = lc === DEMO_WALLET_ADDRESS.toLowerCase()
  const activity = isSelf || isDemo ? getEngine().walletHistory(address).slice(0, 20) : []
  const byKey = new Map(tokens.map((t) => [`${t.token.chain}:${t.token.address.toLowerCase()}`, t]))
  return ok({
    address,
    joinedAt: user?.joinedAt ?? (created.length ? Math.min(...created.map((t) => t.token.createdAt)) : null),
    reputation: (user?.reputation ?? 0) + created.length * 5 + comments.length,
    createdTokens: created,
    comments: comments.slice(0, 20).map((c) => ({ id: c.id, content: c.content, createdAt: c.createdAt, likes: c.likes, token: byKey.get(c.tokenKey)?.token ?? null })),
    activity,
    holdings: isSelf || isDemo ? getEngine().portfolio(address).holdings : null,
    isSelf,
  })
})
