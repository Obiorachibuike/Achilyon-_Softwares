import 'server-only'
import { z } from 'zod'
import type { Candle, ChainId, MarketTrade, Timeframe } from '@/types'
import { NETWORKS } from '@/lib/blockchain/chains'
import { serverEnv } from '@/lib/env.server'
import { cached } from '@/lib/cache.server'
import { ProviderError } from './types'

/**
 * GeckoTerminal adapter for live OHLCV candles and pool trades (public,
 * keyless API). DexScreener has no public candle endpoint, so live charts use
 * this source. If it is unavailable the UI shows an error state — it never
 * falls back to generated data in live mode.
 */

const TF: Record<Timeframe, { unit: 'minute' | 'hour' | 'day'; aggregate: number; resample?: number }> = {
  '1m': { unit: 'minute', aggregate: 1 },
  '5m': { unit: 'minute', aggregate: 5 },
  '15m': { unit: 'minute', aggregate: 15 },
  '1h': { unit: 'hour', aggregate: 1 },
  '4h': { unit: 'hour', aggregate: 4 },
  '1d': { unit: 'day', aggregate: 1 },
  '1w': { unit: 'day', aggregate: 1, resample: 7 },
  '1M': { unit: 'day', aggregate: 1, resample: 30 },
}

const ohlcvSchema = z.object({ data: z.object({ attributes: z.object({ ohlcv_list: z.array(z.array(z.number()).min(6)) }) }) })

const tradeSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    attributes: z.object({
      block_timestamp: z.string(),
      tx_hash: z.string(),
      tx_from_address: z.string(),
      kind: z.enum(['buy', 'sell']),
      volume_in_usd: z.string(),
      from_token_amount: z.string(),
      to_token_amount: z.string(),
      price_from_in_usd: z.string(),
      price_to_in_usd: z.string(),
    }),
  })),
})

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${serverEnv().GECKOTERMINAL_API_BASE}${path}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12_000) })
  if (res.status === 429) throw new ProviderError('Chart data rate limit reached — try again shortly', 429)
  if (!res.ok) throw new ProviderError(`GeckoTerminal responded ${res.status}`)
  return res.json()
}

/** Merge consecutive candles into buckets of `size` (used for 1W / 1M). */
export function resampleCandles(candles: Candle[], size: number): Candle[] {
  const out: Candle[] = []
  for (let i = 0; i < candles.length; i += size) {
    const group = candles.slice(i, i + size)
    const first = group[0]
    const last = group[group.length - 1]
    if (!first || !last) continue
    out.push({
      time: first.time,
      open: first.open,
      close: last.close,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      volume: group.reduce((s, c) => s + c.volume, 0),
    })
  }
  return out
}

export const geckoterminal = {
  async candles(chain: ChainId, poolAddress: string, timeframe: Timeframe): Promise<Candle[]> {
    const network = NETWORKS[chain].geckoId
    if (!network) throw new ProviderError('Charts are not available for this network', 404)
    const tf = TF[timeframe]
    return cached(`gt:ohlcv:${chain}:${poolAddress}:${timeframe}`, 30_000, async () => {
      const json = ohlcvSchema.parse(await get(`/networks/${network}/pools/${encodeURIComponent(poolAddress)}/ohlcv/${tf.unit}?aggregate=${tf.aggregate}&limit=${tf.resample ? 1000 : 300}&currency=usd`))
      const candles = json.data.attributes.ohlcv_list
        .map(([time = 0, open = 0, high = 0, low = 0, close = 0, volume = 0]) => ({ time, open, high, low, close, volume }))
        .sort((a, b) => a.time - b.time)
      return tf.resample ? resampleCandles(candles, tf.resample) : candles
    })
  },

  async trades(chain: ChainId, poolAddress: string, tokenAddress: string, symbol: string, limit: number): Promise<MarketTrade[]> {
    const network = NETWORKS[chain].geckoId
    if (!network) return []
    return cached(`gt:trades:${chain}:${poolAddress}`, 15_000, async () => {
      const json = tradeSchema.parse(await get(`/networks/${network}/pools/${encodeURIComponent(poolAddress)}/trades`))
      return json.data.slice(0, limit).map((d): MarketTrade => {
        const a = d.attributes
        const buy = a.kind === 'buy'
        return {
          id: d.id,
          hash: a.tx_hash,
          chain,
          tokenAddress,
          symbol,
          side: a.kind,
          amountUsd: Number(a.volume_in_usd) || 0,
          amountToken: Number(buy ? a.to_token_amount : a.from_token_amount) || 0,
          priceUsd: Number(buy ? a.price_to_in_usd : a.price_from_in_usd) || 0,
          wallet: a.tx_from_address,
          timestamp: Date.parse(a.block_timestamp),
          status: 'confirmed',
          source: 'live',
        }
      })
    })
  },
}
