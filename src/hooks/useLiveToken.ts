'use client'
import type { MarketToken } from '@/types'
import { tokenKey } from '@/lib/blockchain/chains'
import { useRealtimeStore, type LiveQuote } from '@/stores/realtime'

/** Overlays the latest streamed quote onto a cached token (only if newer). */
export function useLiveToken(t: MarketToken): { token: MarketToken; quote: LiveQuote | undefined } {
  const quote = useRealtimeStore((s) => s.quotes[tokenKey(t.token.chain, t.token.address)])
  if (!quote || quote.at < t.market.updatedAt) return { token: t, quote: undefined }
  return {
    quote,
    token: {
      ...t,
      market: { ...t.market, priceUsd: quote.priceUsd, marketCap: quote.marketCap, volume: { ...t.market.volume, h24: quote.volume24h }, priceChange: { ...t.market.priceChange, h24: quote.change24h } },
      curve: t.curve && quote.progress !== null ? { ...t.curve, progress: quote.progress } : t.curve,
    },
  }
}
