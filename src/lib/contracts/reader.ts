import { getAbiItem, type Address, type Hash, type PublicClient } from 'viem'
import type { Candle, MarketToken, MarketTrade, Timeframe } from '@/types'
import { achilyonLaunchpadAbi } from './abi'
import type { LaunchpadDeployment } from './deployments'
import { curveSnapshot, spotPriceQuote, toUnits, type OnchainCurve } from './curveMath'
import { decodeMetadata, type TokenMetadata } from './metadata'
import { readCurve, readPoolAddress, readPoolReserves } from './launchpad'

/**
 * Reads launchpad state straight from the chain: `TokenCreated` / `Trade`
 * logs plus `getCurve`. Log scans are chunked and capped to a recent block
 * window — full history needs an indexer (see docs/DATABASE.md).
 */

export interface LaunchRecord {
  token: Address
  creator: Address
  name: string
  symbol: string
  metadata: TokenMetadata
  totalSupply: bigint
  curveBps: number
  creatorBps: number
  feeBps: number
  blockNumber: bigint
  txHash: Hash
  timestamp: number
}

export interface TradeRecord {
  token: Address
  trader: Address
  isBuy: boolean
  quoteAmount: bigint
  tokenAmount: bigint
  fee: bigint
  virtualTokenReserve: bigint
  virtualQuoteReserve: bigint
  realQuoteReserve: bigint
  blockNumber: bigint
  txHash: Hash
  logIndex: number
  timestamp: number
}

export interface ScanOptions {
  /** Blocks per eth_getLogs request (providers commonly cap at 10k). */
  chunk?: bigint
  /** Maximum blocks scanned back from the head. */
  maxBlocks?: bigint
}

const TOKEN_CREATED = getAbiItem({ abi: achilyonLaunchpadAbi, name: 'TokenCreated' })
const TRADE = getAbiItem({ abi: achilyonLaunchpadAbi, name: 'Trade' })

async function blockRange(pc: PublicClient, d: LaunchpadDeployment, opts: ScanOptions) {
  const head = await pc.getBlockNumber()
  const maxBlocks = opts.maxBlocks ?? 500_000n
  const floor = head > maxBlocks ? head - maxBlocks : 0n
  return { from: d.startBlock > floor ? d.startBlock : floor, to: head, partial: d.startBlock < floor }
}

async function timestamps(pc: PublicClient, blocks: bigint[]): Promise<Map<bigint, number>> {
  const unique = [...new Set(blocks)]
  const out = new Map<bigint, number>()
  // Bounded concurrency to stay friendly to public RPCs.
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10)
    const got = await Promise.all(batch.map((n) => pc.getBlock({ blockNumber: n })))
    got.forEach((b, j) => out.set(batch[j]!, Number(b.timestamp) * 1000))
  }
  return out
}

export async function scanLaunches(pc: PublicClient, d: LaunchpadDeployment, opts: ScanOptions & { token?: Address } = {}): Promise<{ launches: LaunchRecord[]; partial: boolean }> {
  const { from, to, partial } = await blockRange(pc, d, opts)
  const chunk = opts.chunk ?? 5_000n
  const logs = []
  for (let start = from; start <= to; start += chunk) {
    const end = start + chunk - 1n > to ? to : start + chunk - 1n
    logs.push(...(await pc.getLogs({ address: d.address, event: TOKEN_CREATED, args: opts.token ? { token: opts.token } : undefined, fromBlock: start, toBlock: end, strict: true })))
  }
  const ts = await timestamps(pc, logs.map((l) => l.blockNumber))
  const launches = logs.map((l) => ({
    token: l.args.token,
    creator: l.args.creator,
    name: l.args.name,
    symbol: l.args.symbol,
    metadata: decodeMetadata(l.args.metadataURI),
    totalSupply: l.args.totalSupply,
    curveBps: Number(l.args.curveBps),
    creatorBps: Number(l.args.creatorBps),
    feeBps: Number(l.args.feeBps),
    blockNumber: l.blockNumber,
    txHash: l.transactionHash,
    timestamp: ts.get(l.blockNumber) ?? 0,
  }))
  return { launches: launches.reverse(), partial }
}

export async function scanTrades(pc: PublicClient, d: LaunchpadDeployment, filter: { token?: Address; trader?: Address } = {}, opts: ScanOptions = {}): Promise<TradeRecord[]> {
  const { from, to } = await blockRange(pc, d, opts)
  const chunk = opts.chunk ?? 5_000n
  const logs = []
  const args = filter.token || filter.trader ? { ...(filter.token ? { token: filter.token } : {}), ...(filter.trader ? { trader: filter.trader } : {}) } : undefined
  for (let start = from; start <= to; start += chunk) {
    const end = start + chunk - 1n > to ? to : start + chunk - 1n
    logs.push(...(await pc.getLogs({ address: d.address, event: TRADE, args, fromBlock: start, toBlock: end, strict: true })))
  }
  const ts = await timestamps(pc, logs.map((l) => l.blockNumber))
  return logs
    .map((l) => ({
      token: l.args.token,
      trader: l.args.trader,
      isBuy: l.args.isBuy,
      quoteAmount: l.args.quoteAmount,
      tokenAmount: l.args.tokenAmount,
      fee: l.args.fee,
      virtualTokenReserve: l.args.virtualTokenReserve,
      virtualQuoteReserve: l.args.virtualQuoteReserve,
      realQuoteReserve: l.args.realQuoteReserve,
      blockNumber: l.blockNumber,
      txHash: l.transactionHash,
      logIndex: l.logIndex,
      timestamp: ts.get(l.blockNumber) ?? 0,
    }))
    .reverse()
}

// ─── Mapping to app models ──────────────────────────────────────────────────

const ZERO = '0x0000000000000000000000000000000000000000'
const priceAfter = (t: TradeRecord) => spotPriceQuote({ virtualQuoteReserve: t.virtualQuoteReserve, virtualTokenReserve: t.virtualTokenReserve } as OnchainCurve)

export function toMarketTrade(d: LaunchpadDeployment, t: TradeRecord, symbol: string, quoteUsd: number): MarketTrade {
  const quote = toUnits(t.quoteAmount)
  const tokens = toUnits(t.tokenAmount)
  return {
    id: `${t.txHash}-${t.logIndex}`,
    hash: t.txHash,
    chain: d.chain,
    tokenAddress: t.token,
    symbol,
    side: t.isBuy ? 'buy' : 'sell',
    amountToken: tokens,
    amountUsd: quote * quoteUsd,
    priceUsd: tokens > 0 ? (quote / tokens) * quoteUsd : 0,
    wallet: t.trader,
    timestamp: t.timestamp,
    status: 'confirmed',
    source: 'live',
  }
}

/**
 * Price (quote per token) at launch. Fees are taken outside the reserves, so
 * k = vQ·vT is invariant and vT₀ = supply·(curveBps + 2800) / 10000.
 */
export function launchPriceQuote(launch: Pick<LaunchRecord, 'totalSupply' | 'curveBps'>, curve: Pick<OnchainCurve, 'virtualQuoteReserve' | 'virtualTokenReserve'>): number {
  const vT0 = toUnits((launch.totalSupply * BigInt(launch.curveBps + 2800)) / 10_000n)
  return vT0 > 0 ? (toUnits(curve.virtualQuoteReserve) * toUnits(curve.virtualTokenReserve)) / (vT0 * vT0) : 0
}

/** Live state of a graduated token's DEX pool. */
export interface PoolState {
  address: Address
  tokenReserve: bigint
  quoteReserve: bigint
}

export const dexSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'dex'

/**
 * `trades` newest first. For a graduated token pass its `pool`: price and
 * liquidity then come from the pool's reserves (the curve is closed). Trades
 * and candles still cover curve history only — pool swaps need an indexer.
 */
export function buildMarketToken(d: LaunchpadDeployment, launch: LaunchRecord, curve: OnchainCurve, trades: TradeRecord[], quoteUsd: number, now = Date.now(), pool: PoolState | null = null): MarketToken {
  const snapshot = curveSnapshot(curve, launch.totalSupply, d.nativeSymbol, quoteUsd)
  const onPool = curve.migrated && pool !== null && pool.tokenReserve > 0n
  const spot = onPool ? toUnits(pool.quoteReserve) / toUnits(pool.tokenReserve) : spotPriceQuote(curve)
  const priceUsd = spot * quoteUsd
  const supply = toUnits(launch.totalSupply)
  const initialPrice = launchPriceQuote(launch, curve)
  // Price at `ms` ago = price after the last trade before then (or the launch price).
  const priceAt = (ms: number) => {
    const cutoff = now - ms
    const before = trades.find((t) => t.timestamp <= cutoff)
    return before ? priceAfter(before) : launch.timestamp <= cutoff ? initialPrice : null
  }
  const change = (ms: number) => {
    const then = priceAt(ms) ?? initialPrice
    return then > 0 ? (spot / then - 1) * 100 : 0
  }
  const within = (ms: number) => trades.filter((t) => t.timestamp >= now - ms)
  const volume = (ms: number) => within(ms).reduce((s, t) => s + toUnits(t.quoteAmount) * quoteUsd, 0)
  const counts = (ms: number) => {
    const w = within(ms)
    return { buys: w.filter((t) => t.isBuy).length, sells: w.filter((t) => !t.isBuy).length }
  }
  const H = 3_600_000
  // Pool liquidity counts both sides (standard DEX convention); the curve counts the native it holds.
  const liquidityUsd = onPool ? 2 * toUnits(pool.quoteReserve) * quoteUsd : toUnits(curve.realQuoteReserve) * quoteUsd
  const socials = { website: launch.metadata.website, twitter: launch.metadata.twitter, telegram: launch.metadata.telegram, discord: launch.metadata.discord }
  return {
    token: {
      chain: d.chain, address: launch.token, name: launch.name, symbol: launch.symbol, decimals: 18, logoUrl: null,
      description: launch.metadata.description ?? '', socials, creator: launch.creator, createdAt: launch.timestamp,
      totalSupply: supply, verified: false, status: curve.migrated ? 'migrated' : 'bonding', launchpad: true,
    },
    market: {
      priceUsd,
      priceChange: { m5: change(5 * 60_000), h1: change(H), h6: change(6 * H), h24: change(24 * H) },
      volume: { h1: volume(H), h6: volume(6 * H), h24: volume(24 * H) },
      liquidityUsd, marketCap: priceUsd * supply, fdv: priceUsd * supply,
      txns: { h1: counts(H), h24: counts(24 * H) },
      holders: null,
      updatedAt: now,
    },
    pair: {
      chain: d.chain,
      address: onPool ? pool.address : launch.token,
      dexId: onPool ? dexSlug(d.dexName) : 'achilyon',
      dexName: onPool ? d.dexName : 'Achilyon Curve',
      baseToken: { address: launch.token, symbol: launch.symbol, name: launch.name },
      quoteToken: { address: ZERO, symbol: d.nativeSymbol, name: d.nativeSymbol },
      priceUsd, priceNative: spot, liquidityUsd, volume24h: volume(24 * H), txns24h: counts(24 * H), priceChange24h: change(24 * H),
      createdAt: launch.timestamp, source: 'live',
    },
    curve: snapshot,
    social: { comments: 0, watchers: 0 },
    source: 'live',
  }
}

export const TIMEFRAME_SECONDS: Record<Timeframe, number> = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14_400, '1d': 86_400, '1w': 604_800, '1M': 2_592_000 }

/** OHLC candles in USD from trades (any order). Opens at the previous close. */
export function candlesFromTrades(trades: TradeRecord[], initialPriceQuote: number, quoteUsd: number, timeframe: Timeframe): Candle[] {
  const size = TIMEFRAME_SECONDS[timeframe]
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp || Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex)
  const candles: Candle[] = []
  let last = initialPriceQuote * quoteUsd
  for (const t of sorted) {
    const time = Math.floor(t.timestamp / 1000 / size) * size
    const price = priceAfter(t) * quoteUsd
    const volume = toUnits(t.quoteAmount) * quoteUsd
    const c = candles[candles.length - 1]
    if (c && c.time === time) {
      c.high = Math.max(c.high, price)
      c.low = Math.min(c.low, price)
      c.close = price
      c.volume += volume
    } else {
      candles.push({ time, open: last, high: Math.max(last, price), low: Math.min(last, price), close: price, volume })
    }
    last = price
  }
  return candles
}

/** Reads one launchpad token (null if the address was not launched here). */
export async function readLaunchedToken(pc: PublicClient, d: LaunchpadDeployment, token: Address, quoteUsd: number, opts: ScanOptions = {}): Promise<{ token: MarketToken; trades: TradeRecord[]; launch: LaunchRecord; curve: OnchainCurve; pool: PoolState | null } | null> {
  const curve = await readCurve(pc, d.address, token)
  if (!curve) return null
  const [{ launches }, trades] = await Promise.all([scanLaunches(pc, d, { ...opts, token }), scanTrades(pc, d, { token }, opts)])
  const launch = launches[0]
  if (!launch) return null // created before the scan window; needs an indexer
  const pool = curve.migrated ? await readPool(pc, token) : null
  return { token: buildMarketToken(d, launch, curve, trades, quoteUsd, Date.now(), pool), trades, launch, curve, pool }
}

export async function readPool(pc: PublicClient, token: Address): Promise<PoolState | null> {
  const address = await readPoolAddress(pc, token)
  const reserves = await readPoolReserves(pc, address, token)
  return reserves ? { address, ...reserves } : null
}
