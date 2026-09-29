import type { Candle, ChainId, MarketTrade, Timeframe, TokenSocials } from '@/types'
import { NETWORKS } from '@/lib/blockchain/chains'
import { between, evmAddress, gaussian, hashString, intBetween, logBetween, mulberry32, pick, rngFor, solanaAddress, txHash, type Rng } from './prng'

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14_400, '1d': 86_400, '1w': 604_800, '1M': 2_592_000,
}

export function randomAddress(rng: Rng, chain: ChainId): string {
  return NETWORKS[chain].kind === 'solana' ? solanaAddress(rng) : evmAddress(rng)
}

export function randomHash(rng: Rng, chain: ChainId): string {
  return txHash(rng, NETWORKS[chain].kind === 'solana')
}

export function demoSocials(symbol: string, kinds: ('website' | 'twitter' | 'telegram' | 'discord')[] = []): TokenSocials {
  // `.example` is reserved (RFC 2606) so demo links can never resolve to a real project.
  const slug = symbol.toLowerCase()
  const s: TokenSocials = {}
  if (kinds.includes('website')) s.website = `https://${slug}.example`
  if (kinds.includes('twitter')) s.twitter = `https://x.com/${slug}_demo`
  if (kinds.includes('telegram')) s.telegram = `https://t.me/${slug}_demo`
  if (kinds.includes('discord')) s.discord = `https://discord.gg/${slug}demo`
  return s
}

/**
 * Candles via a Brownian bridge that ends exactly at the current price, so
 * the chart always agrees with the quoted price. Volatility scales with the
 * square root of the bucket length. Deterministic per token + timeframe.
 */
export function generateCandles(opts: {
  seedKey: string
  timeframe: Timeframe
  priceUsd: number
  change24h: number
  volume24h: number
  createdAt: number
  now: number
  count?: number
  hourlyVol?: number
}): Candle[] {
  const { seedKey, timeframe, priceUsd, change24h, volume24h, createdAt, now } = opts
  const step = TIMEFRAME_SECONDS[timeframe]
  const end = Math.floor(now / 1000 / step) * step
  const maxByAge = Math.max(2, Math.floor((now - createdAt) / 1000 / step) + 1)
  const n = Math.min(opts.count ?? 240, maxByAge)
  const rng = mulberry32(hashString(`${seedKey}:${timeframe}`))
  const sigma = (opts.hourlyVol ?? 0.025) * Math.sqrt(step / 3600)

  const rangeHours = (n * step) / 3600
  const r24 = Math.log(Math.max(0.01, 1 + change24h / 100))
  const startLog = Math.log(priceUsd) - (rangeHours <= 24 ? r24 * (rangeHours / 24) : r24 + gaussian(rng) * sigma * Math.sqrt(n) * 0.5)

  // Random walk, then bridge so the last close hits the current price.
  const walk: number[] = [0]
  for (let i = 1; i < n; i++) walk.push((walk[i - 1] ?? 0) + gaussian(rng) * sigma)
  const endLog = Math.log(priceUsd)
  const drift = walk[n - 1] ?? 0
  const closes = walk.map((w, i) => Math.exp(startLog + w - (drift * i) / Math.max(1, n - 1) + ((endLog - startLog) * i) / Math.max(1, n - 1)))

  const volPerBucket = (volume24h / 86_400) * step
  const candles: Candle[] = []
  let prevClose = closes[0] ?? priceUsd
  for (let i = 0; i < n; i++) {
    const close = closes[i] ?? priceUsd
    const open = i === 0 ? close * (1 + gaussian(rng) * sigma * 0.3) : prevClose
    const wick = Math.abs(gaussian(rng)) * sigma * 0.6
    const high = Math.max(open, close) * (1 + wick)
    const low = Math.min(open, close) * (1 - Math.abs(gaussian(rng)) * sigma * 0.6)
    const move = Math.abs(close - open) / open
    const volume = volPerBucket * between(rng, 0.4, 1.4) * (1 + move / Math.max(sigma, 1e-6) * 0.5)
    candles.push({ time: end - (n - 1 - i) * step, open, high, low, close, volume })
    prevClose = close
  }
  return candles
}

/** Historical trade tape for a token (most recent first). */
export function generateTrades(opts: {
  seedKey: string
  chain: ChainId
  tokenAddress: string
  symbol: string
  priceUsd: number
  volume24h: number
  buys: number
  sells: number
  createdAt: number
  now: number
  count?: number
}): MarketTrade[] {
  const rng = rngFor(`${opts.seedKey}:trades`)
  const total = Math.max(1, opts.buys + opts.sells)
  const avg = opts.volume24h / total
  const wallets = Array.from({ length: 24 }, () => randomAddress(rng, opts.chain))
  const count = opts.count ?? 60
  const span = Math.min(opts.now - opts.createdAt, 6 * 3_600_000)
  const trades: MarketTrade[] = []
  let t = opts.now
  for (let i = 0; i < count; i++) {
    t -= (span / count) * between(rng, 0.2, 1.8)
    if (t < opts.createdAt) break
    const side = rng() < opts.buys / total ? 'buy' : 'sell'
    const amountUsd = Math.max(5, avg * logBetween(rng, 0.1, 6))
    const priceUsd = opts.priceUsd * (1 + gaussian(rng) * 0.01 * Math.sqrt(i + 1))
    trades.push({
      id: `${opts.seedKey}-h${i}`,
      hash: randomHash(rng, opts.chain),
      chain: opts.chain,
      tokenAddress: opts.tokenAddress,
      symbol: opts.symbol,
      side,
      amountUsd,
      priceUsd,
      amountToken: amountUsd / priceUsd,
      wallet: pick(rng, wallets),
      timestamp: Math.round(t),
      status: 'confirmed',
      source: 'demo',
    })
  }
  return trades
}

export function randomHolderCount(rng: Rng, mcap: number): number {
  return Math.max(12, Math.round(Math.sqrt(mcap) * between(rng, 0.6, 2.2)))
}

export { intBetween, logBetween, between, gaussian, rngFor, pick }
