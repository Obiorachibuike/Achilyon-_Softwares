import 'server-only'
import { createPublicClient, getAddress, http, isAddress, type Address, type PublicClient } from 'viem'
import type { ChainId, MarketToken, WalletTransaction } from '@/types'
import { cached } from '@/lib/cache.server'
import { NETWORKS } from '@/lib/blockchain/chains'
import { rpcUrl, VIEM_CHAINS } from '@/lib/blockchain/wallets'
import { launchpadDeployments, launchpadFor, type LaunchpadDeployment } from '@/lib/contracts/deployments'
import { readCurve } from '@/lib/contracts/launchpad'
import { buildMarketToken, candlesFromTrades, launchPriceQuote, readLaunchedToken, readPool, scanLaunches, scanTrades, toMarketTrade, type TradeRecord } from '@/lib/contracts/reader'
import { dexscreener } from './dexscreener'
import type { MarketDataProvider } from './types'

/**
 * Surfaces tokens launched through the on-chain Achilyon launchpad
 * (NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS) next to whichever market provider is
 * active. Everything here is read from the chain — nothing is simulated.
 */

/** Wrapped native tokens used to price the curve's quote asset via DexScreener. */
const WRAPPED_NATIVE: Partial<Record<ChainId, string>> = {
  ethereum: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  base: '0x4200000000000000000000000000000000000006',
  arbitrum: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  polygon: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  bsc: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  avalanche: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
}

export interface LaunchpadRuntime {
  deployments: () => LaunchpadDeployment[]
  client: (d: LaunchpadDeployment) => PublicClient | null
  /** USD per native coin, and whether it is a live price or a reference value. */
  quoteUsd: (d: LaunchpadDeployment) => Promise<{ usd: number; live: boolean }>
}

const clients = new Map<string, PublicClient>()

const defaultRuntime: LaunchpadRuntime = {
  deployments: launchpadDeployments,
  client(d) {
    const url = rpcUrl(d.chain)
    // A testnet deployment must not fall back to the mainnet public RPC.
    if (d.testnet && !url) return null
    const key = `${d.chain}:${url ?? 'default'}`
    let c = clients.get(key)
    if (!c) {
      const chain = d.testnet ? undefined : VIEM_CHAINS[d.chain]
      c = createPublicClient({ chain, transport: http(url, { timeout: 10_000, retryCount: 1 }) }) as PublicClient
      clients.set(key, c)
    }
    return c
  },
  async quoteUsd(d) {
    const reference = { usd: NETWORKS[d.chain].curveQuote.usdReference, live: false }
    // Testnet coins have no market price; show USD at the reference rate.
    const wrapped = WRAPPED_NATIVE[d.chain]
    if (d.testnet || !wrapped) return reference
    try {
      return await cached(`native-usd:${d.chain}`, 60_000, async () => {
        const pairs = await dexscreener.tokenPairs(d.chain, wrapped)
        const best = pairs
          .filter((p) => p.baseToken.address.toLowerCase() === wrapped.toLowerCase() && Number(p.priceUsd) > 0)
          .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0]
        if (!best) throw new Error('no wrapped-native pair')
        return { usd: Number(best.priceUsd), live: true }
      })
    } catch {
      return reference
    }
  },
}

let runtime = defaultRuntime
/** Test hook: point the provider at a local chain. */
export function setLaunchpadRuntime(r: Partial<LaunchpadRuntime> | null) {
  runtime = r ? { ...defaultRuntime, ...r } : defaultRuntime
}

function deploymentFor(chain: ChainId): LaunchpadDeployment | null {
  return runtime.deployments().find((d) => d.chain === chain) ?? (runtime === defaultRuntime ? launchpadFor(chain) : null)
}

const MAX_LISTED = 100

async function listForDeployment(d: LaunchpadDeployment): Promise<MarketToken[]> {
  const pc = runtime.client(d)
  if (!pc) return []
  return cached(`launchpad:list:${d.chain}:${d.address}`, 15_000, async () => {
    const [{ launches }, trades, price] = await Promise.all([scanLaunches(pc, d), scanTrades(pc, d), runtime.quoteUsd(d)])
    const byToken = new Map<string, TradeRecord[]>()
    for (const t of trades) {
      const k = t.token.toLowerCase()
      byToken.set(k, [...(byToken.get(k) ?? []), t])
    }
    const recent = launches.slice(0, MAX_LISTED)
    const curves = await Promise.all(recent.map((l) => readCurve(pc, d.address, l.token)))
    const pools = await Promise.all(curves.map((c, i) => (c?.migrated ? readPool(pc, recent[i]!.token).catch(() => null) : null)))
    const now = Date.now()
    return recent.flatMap((l, i) => {
      const curve = curves[i]
      return curve ? [buildMarketToken(d, l, curve, byToken.get(l.token.toLowerCase()) ?? [], price.usd, now, pools[i] ?? null)] : []
    })
  })
}

async function readOne(chain: ChainId, address: string) {
  const d = deploymentFor(chain)
  if (!d || !isAddress(address)) return null
  const pc = runtime.client(d)
  if (!pc) return null
  const token = getAddress(address) as Address
  return cached(`launchpad:token:${chain}:${token}`, 5_000, async () => {
    const price = await runtime.quoteUsd(d)
    const res = await readLaunchedToken(pc, d, token, price.usd)
    return res ? { ...res, d, price } : null
  })
}

export async function listLaunchpadTokens(): Promise<MarketToken[]> {
  const settled = await Promise.allSettled(runtime.deployments().map(listForDeployment))
  return settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []))
}

export async function getLaunchpadToken(chain: ChainId, address: string): Promise<MarketToken | null> {
  try {
    return (await readOne(chain, address))?.token ?? null
  } catch {
    return null
  }
}

/** Launchpad buys/sells by a wallet across all deployments (real wallets only). */
export async function launchpadWalletActivity(wallet: string): Promise<WalletTransaction[]> {
  if (!isAddress(wallet)) return []
  const trader = getAddress(wallet) as Address
  const settled = await Promise.allSettled(
    runtime.deployments().map(async (d) => {
      const pc = runtime.client(d)
      if (!pc) return []
      const [trades, tokens, price] = await Promise.all([scanTrades(pc, d, { trader }), listForDeployment(d), runtime.quoteUsd(d)])
      const symbols = new Map(tokens.map((t) => [t.token.address.toLowerCase(), t.token.symbol]))
      return trades.map((t) => {
        const { side, ...rest } = toMarketTrade(d, t, symbols.get(t.token.toLowerCase()) ?? '?', price.usd)
        return { ...rest, type: side } satisfies WalletTransaction
      })
    }),
  )
  return settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : [])).sort((a, b) => b.timestamp - a.timestamp)
}

/** An on-chain launchpad token — on its curve or graduated. Its history comes from launchpad logs. */
const isOnchainLaunch = (t: MarketToken) => t.token.launchpad && t.source === 'live'

/** Wraps a market provider so on-chain launchpad tokens are listed, searchable and tradable alongside it. */
export function withLaunchpad(base: MarketDataProvider): MarketDataProvider {
  return {
    id: `${base.id}+launchpad`,
    source: base.source,
    async listTokens() {
      const [onchain, rest] = await Promise.all([listLaunchpadTokens(), base.listTokens()])
      return [...onchain, ...rest]
    },
    async getToken(chain, address) {
      return (await getLaunchpadToken(chain, address)) ?? base.getToken(chain, address)
    },
    async getTokenPairs(chain, address) {
      const t = await getLaunchpadToken(chain, address)
      return t ? [t.pair] : base.getTokenPairs(chain, address)
    },
    async getPair(chain, pairAddress) {
      // Curve "pairs" are addressed by their token; graduated ones by their pool.
      const byToken = await getLaunchpadToken(chain, pairAddress)
      if (byToken) return byToken
      const byPool = (await listLaunchpadTokens()).find((t) => t.token.chain === chain && t.pair.address.toLowerCase() === pairAddress.toLowerCase())
      return byPool ?? base.getPair(chain, pairAddress)
    },
    async search(query) {
      const [onchain, rest] = await Promise.all([listLaunchpadTokens(), base.search(query)])
      return [...onchain, ...rest]
    },
    async getCandles(token, timeframe) {
      if (!isOnchainLaunch(token)) return base.getCandles(token, timeframe)
      const r = await readOne(token.token.chain, token.token.address).catch(() => null)
      if (!r) return []
      return candlesFromTrades(r.trades, launchPriceQuote(r.launch, r.curve), r.price.usd, timeframe)
    },
    async getTrades(token, limit) {
      if (!isOnchainLaunch(token)) return base.getTrades(token, limit)
      const r = await readOne(token.token.chain, token.token.address).catch(() => null)
      if (!r) return []
      return r.trades.slice(0, limit).map((t) => toMarketTrade(r.d, t, token.token.symbol, r.price.usd))
    },
  }
}
