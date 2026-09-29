import 'server-only'
import type { ChainId, MarketToken, Timeframe } from '@/types'
import { tokenKey } from '@/lib/blockchain/chains'
import { generateCandles } from '@/data/mock/generate'
import { getEngine } from '@/services/demo/engine'
import type { MarketDataProvider } from './types'

export const demoProvider: MarketDataProvider = {
  id: 'demo',
  source: 'demo',
  async listTokens() {
    return getEngine().list()
  },
  async getToken(chain, address) {
    return getEngine().get(tokenKey(chain, address))
  },
  async getTokenPairs(chain, address) {
    const t = getEngine().get(tokenKey(chain, address))
    return t ? [t.pair] : []
  },
  async getPair(chain: ChainId, pairAddress: string) {
    return getEngine().getByPair(chain, pairAddress)
  },
  async search() {
    return getEngine().list()
  },
  async getCandles(token: MarketToken, timeframe: Timeframe) {
    const key = tokenKey(token.token.chain, token.token.address)
    return generateCandles({
      seedKey: key,
      timeframe,
      priceUsd: token.market.priceUsd,
      change24h: token.market.priceChange.h24,
      volume24h: token.market.volume.h24,
      createdAt: token.token.createdAt,
      now: Date.now(),
      hourlyVol: getEngine().hourlyVolatility(key),
    })
  },
  async getTrades(token, limit) {
    return getEngine().trades(tokenKey(token.token.chain, token.token.address), limit)
  },
}
