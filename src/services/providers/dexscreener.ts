import 'server-only'
import { z } from 'zod'
import type { ChainId, MarketToken, TradingPair } from '@/types'
import { isChainId } from '@/lib/blockchain/chains'
import { dexName } from '@/lib/blockchain/dexes'
import { safeUrl } from '@/lib/security/sanitize'
import { serverEnv } from '@/lib/env.server'
import { cached } from '@/lib/cache.server'
import { ProviderError } from './types'

/**
 * DexScreener adapter (ported from the original Achilyon client). Maps
 * DexScreener pairs into Achilyon's domain types. Runs server-side only; the
 * browser never calls DexScreener directly.
 */

const num = z.union([z.number(), z.string()]).optional().nullable().transform((v) => (v == null ? 0 : Number(v) || 0))
const counts = z.object({ buys: num, sells: num }).partial().optional()

const pairSchema = z.object({
  chainId: z.string(),
  dexId: z.string(),
  pairAddress: z.string(),
  baseToken: z.object({ address: z.string(), name: z.string().default(''), symbol: z.string().default('') }),
  quoteToken: z.object({ address: z.string(), name: z.string().default(''), symbol: z.string().default('') }),
  priceNative: num,
  priceUsd: num,
  txns: z.object({ m5: counts, h1: counts, h6: counts, h24: counts }).partial().optional(),
  volume: z.object({ m5: num, h1: num, h6: num, h24: num }).partial().optional(),
  priceChange: z.object({ m5: num, h1: num, h6: num, h24: num }).partial().optional().nullable(),
  liquidity: z.object({ usd: num }).partial().optional().nullable(),
  fdv: num,
  marketCap: num,
  pairCreatedAt: z.number().optional().nullable(),
  info: z
    .object({
      imageUrl: z.string().optional(),
      websites: z.array(z.object({ url: z.string() }).passthrough()).optional(),
      socials: z.array(z.object({ type: z.string().optional(), url: z.string() }).passthrough()).optional(),
    })
    .passthrough()
    .optional(),
}).passthrough()

type DexPair = z.infer<typeof pairSchema>

function parsePairs(data: unknown): DexPair[] {
  const raw = Array.isArray(data) ? data : typeof data === 'object' && data !== null && 'pairs' in data ? (data as { pairs: unknown }).pairs : []
  if (!Array.isArray(raw)) return []
  return raw.flatMap((p) => {
    const r = pairSchema.safeParse(p)
    return r.success && isChainId(r.data.chainId) ? [r.data] : []
  })
}

async function get(path: string): Promise<unknown> {
  const res = await fetch(`${serverEnv().DEXSCREENER_API_BASE}${path}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12_000) })
  if (res.status === 429) throw new ProviderError('Market data rate limit reached — try again shortly', 429)
  if (!res.ok) throw new ProviderError(`DexScreener responded ${res.status}`)
  return res.json()
}

const enc = encodeURIComponent

export function mapDexPair(p: DexPair): MarketToken {
  const chain = p.chainId as ChainId
  const socials = p.info?.socials ?? []
  const socialUrl = (type: string) => safeUrl(socials.find((s) => s.type === type)?.url)
  const priceUsd = p.priceUsd
  const c = (w?: { buys: number; sells: number } | Partial<{ buys: number; sells: number }>) => ({ buys: w?.buys ?? 0, sells: w?.sells ?? 0 })
  const liquidityUsd = p.liquidity?.usd ?? 0
  const createdAt = p.pairCreatedAt ?? Date.now()
  const pair: TradingPair = {
    chain,
    address: p.pairAddress,
    dexId: p.dexId,
    dexName: dexName(p.dexId),
    baseToken: p.baseToken,
    quoteToken: p.quoteToken,
    priceUsd,
    priceNative: p.priceNative,
    liquidityUsd,
    volume24h: p.volume?.h24 ?? 0,
    txns24h: c(p.txns?.h24),
    priceChange24h: p.priceChange?.h24 ?? 0,
    createdAt,
    source: 'live',
  }
  const image = safeUrl(p.info?.imageUrl)
  return {
    token: {
      chain,
      address: p.baseToken.address,
      name: p.baseToken.name,
      symbol: p.baseToken.symbol,
      decimals: 18,
      logoUrl: image && /^https:\/\/(dd|cdn)\.dexscreener\.com\//.test(image) ? image : null,
      description: '',
      socials: { website: safeUrl(p.info?.websites?.[0]?.url), twitter: socialUrl('twitter'), telegram: socialUrl('telegram'), discord: socialUrl('discord') },
      creator: null,
      createdAt,
      totalSupply: priceUsd > 0 && p.fdv > 0 ? p.fdv / priceUsd : null,
      verified: false,
      status: 'listed',
      launchpad: false,
    },
    market: {
      priceUsd,
      priceChange: { m5: p.priceChange?.m5 ?? 0, h1: p.priceChange?.h1 ?? 0, h6: p.priceChange?.h6 ?? 0, h24: p.priceChange?.h24 ?? 0 },
      volume: { h1: p.volume?.h1 ?? 0, h6: p.volume?.h6 ?? 0, h24: p.volume?.h24 ?? 0 },
      liquidityUsd,
      marketCap: p.marketCap || p.fdv,
      fdv: p.fdv,
      txns: { h1: c(p.txns?.h1), h24: c(p.txns?.h24) },
      holders: null,
      updatedAt: Date.now(),
    },
    pair,
    curve: null,
    social: { comments: 0, watchers: 0 },
    source: 'live',
  }
}

/** Keep the deepest pool per token. */
export function bestPerToken(pairs: DexPair[]): DexPair[] {
  const best = new Map<string, DexPair>()
  for (const p of pairs) {
    const key = `${p.chainId}:${p.baseToken.address.toLowerCase()}`
    const cur = best.get(key)
    if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(key, p)
  }
  return [...best.values()]
}

export const dexscreener = {
  async search(query: string): Promise<DexPair[]> {
    return cached(`ds:search:${query.toLowerCase()}`, 30_000, async () => parsePairs(await get(`/latest/dex/search?q=${enc(query)}`)))
  },
  async tokenPairs(chain: ChainId, address: string): Promise<DexPair[]> {
    return cached(`ds:token:${chain}:${address}`, 20_000, async () => parsePairs(await get(`/tokens/v1/${enc(chain)}/${enc(address)}`)))
  },
  async pair(chain: ChainId, pairAddress: string): Promise<DexPair | null> {
    return cached(`ds:pair:${chain}:${pairAddress}`, 15_000, async () => parsePairs(await get(`/latest/dex/pairs/${enc(chain)}/${enc(pairAddress)}`))[0] ?? null)
  },
  /** Market universe: seed searches + boosted tokens (as in the original app). */
  async universe(): Promise<DexPair[]> {
    return cached('ds:universe', 60_000, async () => {
      const queries = serverEnv().MARKET_QUERIES.split(',').map((q) => q.trim()).filter(Boolean)
      const results = await Promise.allSettled(queries.map((q) => this.search(q)))
      const pairs = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
      if (!pairs.length) throw new ProviderError('DexScreener did not return any data')
      return bestPerToken(pairs.filter((p) => (p.liquidity?.usd ?? 0) > 5_000))
    })
  },
}
