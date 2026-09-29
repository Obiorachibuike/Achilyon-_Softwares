import 'server-only'
import type { ChainId, MarketToken, SearchResults } from '@/types'
import { searchMarket } from '@/lib/market/search'
import { getMarketProvider } from './providers'
import { getRepositories } from '@/services/db/repositories'
import { tokenKey } from './chains'
import { ensureDemoComments } from '@/services/community'

/**
 * Token service functions. Route handlers and server components call these —
 * never providers, RPC endpoints or third-party APIs directly.
 */

function withSocial(t: MarketToken): MarketToken {
  ensureDemoComments(t)
  const repo = getRepositories()
  const key = tokenKey(t.token.chain, t.token.address)
  return {
    ...t,
    token: { ...t.token, verified: repo.moderation.isVerified(key) ?? t.token.verified },
    social: {
      comments: t.social.comments + repo.comments.countFor(key),
      watchers: t.social.watchers + repo.watchlists.watcherCount(key),
    },
  }
}

export async function listTokens(): Promise<MarketToken[]> {
  const repo = getRepositories()
  const tokens = await getMarketProvider().listTokens()
  return tokens.filter((t) => !repo.moderation.isHidden(tokenKey(t.token.chain, t.token.address))).map(withSocial)
}

export async function getToken(chain: ChainId, address: string): Promise<MarketToken | null> {
  const t = await getMarketProvider().getToken(chain, address)
  return t ? withSocial(t) : null
}

export async function getTokenPrice(chain: ChainId, address: string): Promise<number | null> {
  return (await getMarketProvider().getToken(chain, address))?.market.priceUsd ?? null
}

/** Holder count when the provider exposes it (DexScreener does not — returns null). */
export async function getTokenHolders(chain: ChainId, address: string): Promise<number | null> {
  return (await getMarketProvider().getToken(chain, address))?.market.holders ?? null
}

export async function searchTokens(query: string): Promise<SearchResults> {
  const candidates = await getMarketProvider().search(query)
  return searchMarket(candidates.map(withSocial), query)
}

export function featuredKeys(): string[] {
  return getRepositories().moderation.featured()
}
