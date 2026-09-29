import 'server-only'
import type { MarketToken } from '@/types'
import { tokenKey } from '@/lib/blockchain/chains'
import { getEngine } from '@/services/demo/engine'
import { demoProvider } from './demoProvider'
import { bestPerToken, dexscreener, mapDexPair } from './dexscreener'
import { geckoterminal } from './geckoterminal'
import type { MarketDataProvider } from './types'

/**
 * Live provider: real DEX markets from DexScreener + GeckoTerminal.
 * Achilyon launchpad tokens have no on-chain deployment yet, so they are
 * served from the demo engine and remain labelled `source: 'demo'`.
 */
function launchpadTokens(): MarketToken[] {
  return getEngine().list().filter((t) => t.token.launchpad)
}

const isLaunchpad = (t: MarketToken): boolean => t.source === 'demo'

export const liveProvider: MarketDataProvider = {
  id: 'dexscreener',
  source: 'live',
  async listTokens() {
    const live = (await dexscreener.universe()).map(mapDexPair)
    return [...live, ...launchpadTokens()]
  },
  async getToken(chain, address) {
    const demo = getEngine().get(tokenKey(chain, address))
    if (demo) return demo
    const pairs = bestPerToken(await dexscreener.tokenPairs(chain, address))
    const best = pairs.find((p) => p.baseToken.address.toLowerCase() === address.toLowerCase()) ?? pairs[0]
    return best ? mapDexPair(best) : null
  },
  async getTokenPairs(chain, address) {
    if (getEngine().get(tokenKey(chain, address))) return demoProvider.getTokenPairs(chain, address)
    return (await dexscreener.tokenPairs(chain, address)).map((p) => mapDexPair(p).pair).sort((a, b) => b.liquidityUsd - a.liquidityUsd)
  },
  async getPair(chain, pairAddress) {
    const demo = getEngine().getByPair(chain, pairAddress)
    if (demo) return demo
    const p = await dexscreener.pair(chain, pairAddress)
    return p ? mapDexPair(p) : null
  },
  async search(query) {
    const [remote] = await Promise.allSettled([dexscreener.search(query)])
    const live = remote.status === 'fulfilled' ? bestPerToken(remote.value).map(mapDexPair) : []
    return [...live, ...launchpadTokens()]
  },
  async getCandles(token, timeframe) {
    if (isLaunchpad(token)) return demoProvider.getCandles(token, timeframe)
    return geckoterminal.candles(token.token.chain, token.pair.address, timeframe)
  },
  async getTrades(token, limit) {
    if (isLaunchpad(token)) return demoProvider.getTrades(token, limit)
    return geckoterminal.trades(token.token.chain, token.pair.address, token.token.address, token.token.symbol, limit)
  },
}
