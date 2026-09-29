import type { Candle, ChainId, DataSource, MarketToken, MarketTrade, Timeframe, TradingPair } from '@/types'

/**
 * Market data provider contract. The API layer only ever talks to this
 * interface, so demo data, DexScreener, or a future indexer can be swapped
 * without touching routes or UI.
 */
export interface MarketDataProvider {
  readonly id: string
  readonly source: DataSource
  listTokens(): Promise<MarketToken[]>
  getToken(chain: ChainId, address: string): Promise<MarketToken | null>
  getTokenPairs(chain: ChainId, address: string): Promise<TradingPair[]>
  getPair(chain: ChainId, pairAddress: string): Promise<MarketToken | null>
  search(query: string): Promise<MarketToken[]>
  getCandles(token: MarketToken, timeframe: Timeframe): Promise<Candle[]>
  getTrades(token: MarketToken, limit: number): Promise<MarketTrade[]>
}

export class ProviderError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message)
    this.name = 'ProviderError'
  }
}
