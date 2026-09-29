import 'server-only'
import type { Candle, ChainId, MarketToken, Timeframe, TradingPair } from '@/types'
import { getMarketProvider } from './providers'

export async function getPair(chain: ChainId, pairAddress: string): Promise<MarketToken | null> {
  return getMarketProvider().getPair(chain, pairAddress)
}

export async function getTokenPairs(chain: ChainId, tokenAddress: string): Promise<TradingPair[]> {
  return getMarketProvider().getTokenPairs(chain, tokenAddress)
}

export async function getCandles(token: MarketToken, timeframe: Timeframe): Promise<Candle[]> {
  return getMarketProvider().getCandles(token, timeframe)
}
