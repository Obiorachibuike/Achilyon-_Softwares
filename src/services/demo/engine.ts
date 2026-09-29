import 'server-only'
import type { ChainId, Holding, MarketToken, MarketTrade, Portfolio, Token, TokenMarketData, TradingPair, WalletTransaction } from '@/types'
import { NETWORKS, tokenKey } from '@/lib/blockchain/chains'
import { dexName } from '@/lib/blockchain/dexes'
import { applyBuy, applySell, curveAt, defaultCurveConfig, launchCurveConfig, minimumReceived, quoteBuy, quoteSell, summarizeCurve, toSnapshot, type CurveState } from '@/lib/bondingCurve'
import { poolFromLiquidity, quotePoolBuy, quotePoolSell } from '@/lib/market/amm'
import { CATALOG, SPAWN_POOL, type CatalogEntry } from '@/data/mock/catalog'
import { between, demoSocials, gaussian, generateTrades, intBetween, logBetween, pick, randomAddress, randomHash, randomHolderCount, rngFor } from '@/data/mock/generate'
import { mulberry32 } from '@/data/mock/prng'
import { DEMO_WALLET_ADDRESS, publicConfig } from '@/lib/config'

/**
 * Demo market engine.
 *
 * A self-contained, server-side market simulation used when
 * NEXT_PUBLIC_DEMO_MODE=true (and for launchpad curves, which have no
 * on-chain deployment yet). It:
 *  - seeds a deterministic catalog of fictional tokens,
 *  - advances prices lazily with random trades (curve maths for bonding
 *    tokens, x·y=k for pool tokens),
 *  - settles demo-wallet trades and launches against the same state,
 *  - emits events consumed by the realtime stream.
 *
 * Nothing produced here exists on-chain; every record carries source: 'demo'.
 */

export type EngineEvent =
  | { type: 'price'; key: string; priceUsd: number; change24h: number; marketCap: number; volume24h: number; progress: number | null }
  | { type: 'trade'; key: string; trade: MarketTrade }
  | { type: 'token'; key: string; token: MarketToken }
  | { type: 'migrated'; key: string; symbol: string }

interface EngineToken {
  token: Token
  market: TokenMarketData
  pair: TradingPair
  curve: CurveState | null
  social: { comments: number; watchers: number }
  trades: MarketTrade[]
  /** Reference prices used to compute rolling changes. */
  ref: { m5: number; h1: number; h6: number; h24: number }
  hourlyVol: number
}

interface DemoAccount {
  address: string
  cashUsd: number
  positions: Map<string, { amount: number; costUsd: number }>
  realizedPnlUsd: number
  history: WalletTransaction[]
  startValue: number
  createdAt: number
}

const TICK_MS = 2_500
const MAX_CATCHUP_TICKS = 24
const QUOTE_TOKENS: Record<ChainId, { symbol: string; name: string }> = {
  ethereum: { symbol: 'WETH', name: 'Wrapped Ether' },
  base: { symbol: 'WETH', name: 'Wrapped Ether' },
  arbitrum: { symbol: 'WETH', name: 'Wrapped Ether' },
  solana: { symbol: 'SOL', name: 'Wrapped SOL' },
  bsc: { symbol: 'WBNB', name: 'Wrapped BNB' },
  polygon: { symbol: 'WPOL', name: 'Wrapped POL' },
  avalanche: { symbol: 'WAVAX', name: 'Wrapped AVAX' },
}

export class DemoEngine {
  private tokens = new Map<string, EngineToken>()
  private accounts = new Map<string, DemoAccount>()
  private listeners = new Set<(e: EngineEvent) => void>()
  private rng = mulberry32(Date.now() & 0xffffffff)
  private lastTick: number
  private spawnIndex = 0
  private lastSpawn: number
  readonly bootedAt: number

  constructor(now = Date.now()) {
    this.bootedAt = now
    this.lastTick = now
    this.lastSpawn = now
    CATALOG.forEach((entry, i) => this.seed(entry, i, now))
  }

  // ───────────────────────────── seeding ─────────────────────────────

  private seed(entry: CatalogEntry, index: number, now: number) {
    const rng = rngFor(`achilyon:${entry.symbol}:${entry.chain}`)
    const net = NETWORKS[entry.chain]
    const address = randomAddress(rng, entry.chain)
    const createdAt = now - entry.ageHours * 3_600_000
    const creator = randomAddress(rng, entry.chain)
    const totalSupply = entry.status === 'listed' ? pick(rng, [100_000_000, 1_000_000_000, 21_000_000, 500_000_000]) : 1_000_000_000

    let curve: CurveState | null = null
    let priceUsd: number
    let liquidityUsd: number
    let marketCap: number
    if (entry.status === 'bonding') {
      const config = defaultCurveConfig(net.curveQuote.symbol, net.curveQuote.usdReference)
      curve = curveAt(config, config.curveSupply * (entry.progress ?? 0.1))
      const s = summarizeCurve(curve)
      priceUsd = s.priceUsd
      marketCap = s.marketCapUsd
      liquidityUsd = s.virtualLiquidityUsd
    } else {
      marketCap = (entry.mcap ?? 1_000_000) * between(rng, 0.92, 1.08)
      priceUsd = marketCap / totalSupply
      liquidityUsd = marketCap * (entry.status === 'migrated' ? between(rng, 0.08, 0.16) : between(rng, 0.04, 0.14))
    }

    const hourlyVol = entry.status === 'bonding' ? between(rng, 0.05, 0.12) : entry.status === 'migrated' ? between(rng, 0.03, 0.07) : between(rng, 0.008, 0.03)
    const drift = gaussian(rng)
    const change24h = entry.ageHours < 24 ? Math.max(-60, between(rng, 20, 900) * (drift > -0.6 ? 1 : -0.08)) : drift * hourlyVol * 100 * 4
    const change6h = change24h * between(rng, 0.1, 0.6) + gaussian(rng) * hourlyVol * 40
    const change1h = change6h * between(rng, 0.05, 0.4) + gaussian(rng) * hourlyVol * 20
    const change5m = gaussian(rng) * hourlyVol * 10
    const volume24h = liquidityUsd * logBetween(rng, 0.3, entry.status === 'listed' ? 3 : 8)
    const volumeH6 = volume24h * between(rng, 0.2, 0.45)
    const volumeH1 = volumeH6 * between(rng, 0.08, 0.35)
    const avgTrade = entry.status === 'listed' ? between(rng, 400, 2500) : between(rng, 40, 350)
    const tx24 = Math.max(4, Math.round(volume24h / avgTrade))
    const buyShare = Math.min(0.8, Math.max(0.3, 0.5 + change24h / 400 + gaussian(rng) * 0.05))
    const tx1 = Math.max(1, Math.round((tx24 * volumeH1) / volume24h))

    const quote = QUOTE_TOKENS[entry.chain]
    const dexId = entry.status === 'bonding' ? 'achilyon' : entry.dex ?? 'uniswap'
    const token: Token = {
      chain: entry.chain,
      address,
      name: entry.name,
      symbol: entry.symbol,
      decimals: net.kind === 'solana' ? 6 : 18,
      logoUrl: null,
      description: entry.description,
      socials: demoSocials(entry.symbol, entry.socials),
      creator: entry.status === 'listed' ? null : creator,
      createdAt,
      totalSupply,
      verified: Boolean(entry.verified),
      status: entry.status,
      launchpad: entry.status !== 'listed',
    }
    const market: TokenMarketData = {
      priceUsd,
      priceChange: { m5: change5m, h1: change1h, h6: change6h, h24: change24h },
      volume: { h1: volumeH1, h6: volumeH6, h24: volume24h },
      liquidityUsd,
      marketCap,
      fdv: priceUsd * totalSupply,
      txns: { h1: { buys: Math.round(tx1 * buyShare), sells: tx1 - Math.round(tx1 * buyShare) }, h24: { buys: Math.round(tx24 * buyShare), sells: tx24 - Math.round(tx24 * buyShare) } },
      holders: randomHolderCount(rng, marketCap),
      updatedAt: now,
    }
    const pair: TradingPair = {
      chain: entry.chain,
      address: randomAddress(rng, entry.chain),
      dexId,
      dexName: dexName(dexId),
      baseToken: { address, symbol: entry.symbol, name: entry.name },
      quoteToken: { address: randomAddress(rng, entry.chain), ...quote },
      priceUsd,
      priceNative: priceUsd / net.curveQuote.usdReference,
      liquidityUsd,
      volume24h,
      txns24h: market.txns.h24,
      priceChange24h: change24h,
      createdAt: entry.status === 'migrated' ? createdAt + Math.min(entry.ageHours, 6) * 1_800_000 : createdAt,
      source: 'demo',
    }
    const key = tokenKey(entry.chain, address)
    const trades = generateTrades({ seedKey: key, chain: entry.chain, tokenAddress: address, symbol: entry.symbol, priceUsd, volume24h, buys: market.txns.h24.buys, sells: market.txns.h24.sells, createdAt, now })
    this.tokens.set(key, {
      token, market, pair, curve, trades, hourlyVol,
      social: { comments: 0, watchers: Math.round(logBetween(rng, 3, 2000) * (entry.featured ? 4 : 1)) },
      ref: {
        m5: priceUsd / (1 + change5m / 100),
        h1: priceUsd / (1 + change1h / 100),
        h6: priceUsd / (1 + change6h / 100),
        h24: priceUsd / (1 + change24h / 100),
      },
    })
    void index
  }

  // ───────────────────────────── queries ─────────────────────────────

  /** Advance the simulation to `now` (lazy — called on every read). */
  sync(now = Date.now()) {
    const steps = Math.min(MAX_CATCHUP_TICKS, Math.floor((now - this.lastTick) / TICK_MS))
    for (let i = 0; i < steps; i++) this.tick(this.lastTick + (i + 1) * TICK_MS)
    if (steps > 0) this.lastTick = steps === MAX_CATCHUP_TICKS ? now : this.lastTick + steps * TICK_MS
  }

  list(): MarketToken[] {
    this.sync()
    return [...this.tokens.values()].map((t) => this.view(t))
  }

  get(key: string): MarketToken | null {
    this.sync()
    const t = this.tokens.get(key)
    return t ? this.view(t) : null
  }

  getByPair(chain: ChainId, pairAddress: string): MarketToken | null {
    this.sync()
    const p = pairAddress.toLowerCase()
    for (const t of this.tokens.values()) if (t.pair.chain === chain && t.pair.address.toLowerCase() === p) return this.view(t)
    return null
  }

  trades(key: string, limit = 50): MarketTrade[] {
    this.sync()
    return (this.tokens.get(key)?.trades ?? []).slice(0, limit)
  }

  hourlyVolatility(key: string): number {
    return this.tokens.get(key)?.hourlyVol ?? 0.02
  }

  setCommentCount(key: string, count: number) {
    const t = this.tokens.get(key)
    if (t) t.social.comments = count
  }

  adjustWatchers(key: string, delta: number) {
    const t = this.tokens.get(key)
    if (t) t.social.watchers = Math.max(0, t.social.watchers + delta)
  }

  setVerified(key: string, verified: boolean): boolean {
    const t = this.tokens.get(key)
    if (!t) return false
    t.token.verified = verified
    return true
  }

  subscribe(fn: (e: EngineEvent) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private emit(e: EngineEvent) {
    for (const fn of this.listeners) {
      try { fn(e) } catch { /* a broken subscriber must not stop the engine */ }
    }
  }

  private view(t: EngineToken): MarketToken {
    return {
      token: { ...t.token, socials: { ...t.token.socials } },
      market: structuredClone(t.market),
      pair: { ...t.pair },
      curve: t.curve ? toSnapshot(t.curve) : null,
      social: { ...t.social },
      source: 'demo',
    }
  }

  // ─────────────────────────── simulation ────────────────────────────

  private tick(at: number) {
    const all = [...this.tokens.values()]
    const active = all.filter((t) => !(t.curve?.migrated && t.token.status === 'bonding'))
    const count = Math.max(1, Math.round(active.length * 0.12))
    for (let i = 0; i < count; i++) {
      const t = active[Math.floor(this.rng() * active.length)]
      if (t) this.randomTrade(t, at)
    }
    if (at - this.lastSpawn > 75_000 && this.spawnIndex < SPAWN_POOL.length * 3) {
      this.lastSpawn = at
      this.spawnRandomLaunch(at)
    }
  }

  private randomTrade(t: EngineToken, at: number) {
    const bias = t.token.status === 'bonding' ? 0.58 : 0.5 + Math.max(-0.1, Math.min(0.1, t.market.priceChange.h1 / 200))
    const side = this.rng() < bias ? 'buy' : 'sell'
    const scale = t.token.status === 'bonding' ? logBetween(this.rng, 10, 900) : logBetween(this.rng, 50, Math.max(200, t.market.liquidityUsd * 0.004))
    try {
      if (side === 'buy') this.executeBuy(t, scale, randomAddress(this.rng, t.token.chain), at)
      else {
        const tokens = scale / t.market.priceUsd
        this.executeSell(t, tokens, randomAddress(this.rng, t.token.chain), at)
      }
    } catch {
      /* curve edge cases (e.g. selling more than sold) are skipped */
    }
  }

  /** Buy with `usd` worth of the quote asset. Returns the executed trade. */
  private executeBuy(t: EngineToken, usd: number, wallet: string, at: number, minTokensOut = 0): MarketTrade {
    let tokensOut: number
    let fillPrice: number
    if (t.curve && t.token.status === 'bonding') {
      const quoteIn = usd / t.curve.config.quoteUsd
      const r = applyBuy(t.curve, quoteIn, minTokensOut)
      t.curve = r.state
      tokensOut = r.quote.tokensOut
      usd = (r.quote.quoteUsed + r.quote.fee) * t.curve.config.quoteUsd
      fillPrice = r.quote.avgPrice * t.curve.config.quoteUsd
    } else {
      const q = quotePoolBuy(poolFromLiquidity(t.market.liquidityUsd, t.market.priceUsd), usd)
      if (q.amountOut + 1e-9 < minTokensOut) throw new Error('Price moved beyond your slippage tolerance')
      tokensOut = q.amountOut
      fillPrice = q.avgPriceUsd
      const pool = poolFromLiquidity(t.market.liquidityUsd, t.market.priceUsd)
      const newUsd = pool.usdReserve + (usd - q.fee)
      const newTok = pool.tokenReserve - q.amountOut
      t.market.priceUsd = newUsd / newTok
      t.market.liquidityUsd = newUsd * 2
    }
    return this.record(t, 'buy', usd, tokensOut, fillPrice, wallet, at)
  }

  private executeSell(t: EngineToken, tokens: number, wallet: string, at: number, minUsdOut = 0): MarketTrade {
    let usd: number
    let fillPrice: number
    if (t.curve && t.token.status === 'bonding') {
      const q = quoteSell(t.curve, tokens)
      const minQuote = minUsdOut / t.curve.config.quoteUsd
      const r = applySell(t.curve, tokens, minQuote)
      t.curve = r.state
      usd = q.quoteOut * t.curve.config.quoteUsd
      fillPrice = q.avgPrice * t.curve.config.quoteUsd
    } else {
      const pool = poolFromLiquidity(t.market.liquidityUsd, t.market.priceUsd)
      const q = quotePoolSell(pool, tokens)
      if (q.amountOut + 1e-9 < minUsdOut) throw new Error('Price moved beyond your slippage tolerance')
      usd = q.amountOut
      fillPrice = q.avgPriceUsd
      const newUsd = pool.usdReserve - (q.amountOut + q.fee)
      const newTok = pool.tokenReserve + tokens
      t.market.priceUsd = newUsd / newTok
      t.market.liquidityUsd = newUsd * 2
    }
    return this.record(t, 'sell', usd, tokens, fillPrice, wallet, at)
  }

  private record(t: EngineToken, side: 'buy' | 'sell', usd: number, tokens: number, fillPrice: number, wallet: string, at: number): MarketTrade {
    const key = tokenKey(t.token.chain, t.token.address)
    if (t.curve && t.token.status === 'bonding') {
      const s = summarizeCurve(t.curve)
      t.market.priceUsd = s.priceUsd
      t.market.liquidityUsd = s.virtualLiquidityUsd
      if (t.curve.migrated) this.migrate(t, key)
    }
    const m = t.market
    m.marketCap = m.priceUsd * (t.token.totalSupply ?? 0)
    m.fdv = m.marketCap
    m.volume.h1 += usd
    m.volume.h6 += usd
    m.volume.h24 += usd
    m.txns.h1[side === 'buy' ? 'buys' : 'sells'] += 1
    m.txns.h24[side === 'buy' ? 'buys' : 'sells'] += 1
    m.priceChange = {
      m5: (m.priceUsd / t.ref.m5 - 1) * 100,
      h1: (m.priceUsd / t.ref.h1 - 1) * 100,
      h6: (m.priceUsd / t.ref.h6 - 1) * 100,
      h24: (m.priceUsd / t.ref.h24 - 1) * 100,
    }
    if (side === 'buy' && this.rng() < 0.15 && m.holders !== null) m.holders += 1
    m.updatedAt = at
    Object.assign(t.pair, { priceUsd: m.priceUsd, liquidityUsd: m.liquidityUsd, volume24h: m.volume.h24, txns24h: { ...m.txns.h24 }, priceChange24h: m.priceChange.h24 })

    const trade: MarketTrade = {
      id: `${key}-${at}-${Math.floor(this.rng() * 1e9).toString(36)}`,
      hash: randomHash(this.rng, t.token.chain),
      chain: t.token.chain,
      tokenAddress: t.token.address,
      symbol: t.token.symbol,
      side,
      amountUsd: usd,
      amountToken: tokens,
      priceUsd: fillPrice,
      wallet,
      timestamp: at,
      status: 'confirmed',
      source: 'demo',
    }
    t.trades.unshift(trade)
    if (t.trades.length > 150) t.trades.length = 150
    this.emit({ type: 'trade', key, trade })
    this.emit({ type: 'price', key, priceUsd: m.priceUsd, change24h: m.priceChange.h24, marketCap: m.marketCap, volume24h: m.volume.h24, progress: t.curve ? summarizeCurve(t.curve).progress : null })
    return trade
  }

  private migrate(t: EngineToken, key: string) {
    t.token.status = 'migrated'
    const dexId = NETWORKS[t.token.chain].kind === 'solana' ? 'raydium' : 'uniswap'
    t.pair.dexId = dexId
    t.pair.dexName = dexName(dexId)
    // Migrated liquidity: curve proceeds + reserved tokens, valued both sides.
    t.market.liquidityUsd = (t.curve?.quoteRaised ?? 0) * (t.curve?.config.quoteUsd ?? 0) * 2
    this.emit({ type: 'migrated', key, symbol: t.token.symbol })
  }

  private spawnRandomLaunch(at: number) {
    const def = SPAWN_POOL[this.spawnIndex % SPAWN_POOL.length]
    if (!def) return
    const round = Math.floor(this.spawnIndex / SPAWN_POOL.length)
    this.spawnIndex += 1
    const chain = pick(this.rng, ['base', 'solana', 'solana', 'bsc', 'ethereum', 'arbitrum'] as const)
    const creator = randomAddress(this.rng, chain)
    this.createLaunch({
      chain,
      name: round ? `${def.name} ${round + 1}` : def.name,
      symbol: round ? `${def.symbol}${round + 1}` : def.symbol,
      description: def.description,
      logoUrl: null,
      socials: {},
      creator,
      totalSupply: 1_000_000_000,
      decimals: NETWORKS[chain].kind === 'solana' ? 6 : 18,
      curveAllocationPct: 80,
      initialBuyQuote: between(this.rng, 0, 0.3) * (chain === 'solana' ? 10 : 0.5),
      at,
    })
  }

  // ─────────────────────────── launches ──────────────────────────────

  createLaunch(input: {
    chain: ChainId
    name: string
    symbol: string
    description: string
    logoUrl: string | null
    socials: Token['socials']
    creator: string
    totalSupply: number
    decimals: number
    curveAllocationPct: number
    initialBuyQuote: number
    at?: number
  }): { token: MarketToken; hash: string; initialBuy: MarketTrade | null } {
    const at = input.at ?? Date.now()
    const net = NETWORKS[input.chain]
    const address = randomAddress(this.rng, input.chain)
    const config = launchCurveConfig(net.curveQuote.symbol, net.curveQuote.usdReference, input.totalSupply, input.curveAllocationPct)
    const curve = curveAt(config, 0)
    const s = summarizeCurve(curve)
    const quote = QUOTE_TOKENS[input.chain]
    const token: Token = {
      chain: input.chain, address, name: input.name, symbol: input.symbol, decimals: input.decimals, logoUrl: input.logoUrl,
      description: input.description, socials: input.socials, creator: input.creator, createdAt: at, totalSupply: input.totalSupply,
      verified: false, status: 'bonding', launchpad: true,
    }
    const market: TokenMarketData = {
      priceUsd: s.priceUsd, priceChange: { m5: 0, h1: 0, h6: 0, h24: 0 }, volume: { h1: 0, h6: 0, h24: 0 },
      liquidityUsd: s.virtualLiquidityUsd, marketCap: s.marketCapUsd, fdv: s.marketCapUsd,
      txns: { h1: { buys: 0, sells: 0 }, h24: { buys: 0, sells: 0 } }, holders: 1, updatedAt: at,
    }
    const pair: TradingPair = {
      chain: input.chain, address: randomAddress(this.rng, input.chain), dexId: 'achilyon', dexName: dexName('achilyon'),
      baseToken: { address, symbol: input.symbol, name: input.name },
      quoteToken: { address: randomAddress(this.rng, input.chain), ...quote },
      priceUsd: s.priceUsd, priceNative: s.priceQuote, liquidityUsd: s.virtualLiquidityUsd, volume24h: 0,
      txns24h: { buys: 0, sells: 0 }, priceChange24h: 0, createdAt: at, source: 'demo',
    }
    const key = tokenKey(input.chain, address)
    const entry: EngineToken = {
      token, market, pair, curve, trades: [], social: { comments: 0, watchers: 0 }, hourlyVol: 0.08,
      ref: { m5: s.priceUsd, h1: s.priceUsd, h6: s.priceUsd, h24: s.priceUsd },
    }
    this.tokens.set(key, entry)
    let initialBuy: MarketTrade | null = null
    if (input.initialBuyQuote > 0) {
      initialBuy = this.executeBuy(entry, input.initialBuyQuote * config.quoteUsd, input.creator, at)
    }
    const view = this.view(entry)
    this.emit({ type: 'token', key, token: view })
    return { token: view, hash: randomHash(this.rng, input.chain), initialBuy }
  }

  // ─────────────────────────── demo accounts ─────────────────────────

  private account(address: string): DemoAccount {
    const id = address.toLowerCase()
    let acc = this.accounts.get(id)
    if (!acc) {
      acc = { address, cashUsd: publicConfig.demoStartingBalanceUsd, positions: new Map(), realizedPnlUsd: 0, history: [], startValue: publicConfig.demoStartingBalanceUsd, createdAt: Date.now() }
      this.accounts.set(id, acc)
      if (id === DEMO_WALLET_ADDRESS.toLowerCase()) this.seedDemoAccount(acc)
    }
    return acc
  }

  /** Gives the demo wallet a few starter positions so the portfolio isn't empty. */
  private seedDemoAccount(acc: DemoAccount) {
    const picks = ['ACH', 'MOVA', 'SPRK', 'NOVA', 'BYTE']
    const rng = rngFor('demo-account')
    for (const sym of picks) {
      const t = [...this.tokens.values()].find((x) => x.token.symbol === sym)
      if (!t) continue
      const costUsd = between(rng, 300, 1500)
      const entryPrice = t.market.priceUsd * between(rng, 0.7, 1.2)
      acc.positions.set(tokenKey(t.token.chain, t.token.address), { amount: costUsd / entryPrice, costUsd })
      acc.history.push({
        id: `seed-${sym}`, hash: randomHash(rng, t.token.chain), chain: t.token.chain, tokenAddress: t.token.address, symbol: sym,
        type: 'buy', amountUsd: costUsd, amountToken: costUsd / entryPrice, priceUsd: entryPrice, wallet: acc.address,
        timestamp: Date.now() - intBetween(rng, 2, 240) * 3_600_000, status: 'confirmed', source: 'demo',
      })
    }
    acc.history.sort((a, b) => b.timestamp - a.timestamp)
  }

  demoBalance(address: string, key: string): { cashUsd: number; tokenAmount: number } {
    const acc = this.account(address)
    return { cashUsd: acc.cashUsd, tokenAmount: acc.positions.get(key)?.amount ?? 0 }
  }

  /**
   * Settle a demo-wallet trade. `amount` is USD for buys and tokens for
   * sells. Slippage is enforced exactly like an on-chain min-out check.
   */
  demoTrade(address: string, key: string, side: 'buy' | 'sell', amount: number, slippageBps: number): { trade: MarketTrade; token: MarketToken } {
    this.sync()
    const t = this.tokens.get(key)
    if (!t) throw new Error('Token not found')
    const acc = this.account(address)
    const at = Date.now()
    let trade: MarketTrade
    if (side === 'buy') {
      if (amount > acc.cashUsd + 1e-9) throw new Error('Insufficient demo balance')
      const expected = this.expectedOut(t, 'buy', amount)
      trade = this.executeBuy(t, amount, acc.address, at, minimumReceived(expected, slippageBps))
      acc.cashUsd -= trade.amountUsd
      const pos = acc.positions.get(key) ?? { amount: 0, costUsd: 0 }
      acc.positions.set(key, { amount: pos.amount + trade.amountToken, costUsd: pos.costUsd + trade.amountUsd })
    } else {
      const pos = acc.positions.get(key)
      if (!pos || pos.amount <= 0) throw new Error('You have no balance of this token')
      // Like an ERC-20 transfer, selling more than the balance fails rather than
      // partially filling. A tiny tolerance absorbs float rounding on "MAX".
      if (amount > pos.amount * (1 + 1e-9)) throw new Error('Insufficient token balance')
      const qty = Math.min(amount, pos.amount)
      const expected = this.expectedOut(t, 'sell', qty)
      trade = this.executeSell(t, qty, acc.address, at, minimumReceived(expected, slippageBps))
      const basis = pos.costUsd * (qty / pos.amount)
      acc.realizedPnlUsd += trade.amountUsd - basis
      acc.cashUsd += trade.amountUsd
      const remaining = pos.amount - qty
      if (remaining <= pos.amount * 1e-9) acc.positions.delete(key)
      else acc.positions.set(key, { amount: remaining, costUsd: pos.costUsd - basis })
    }
    acc.history.unshift({ ...trade, type: side })
    if (acc.history.length > 200) acc.history.length = 200
    return { trade, token: this.view(t) }
  }

  private expectedOut(t: EngineToken, side: 'buy' | 'sell', amount: number): number {
    if (t.curve && t.token.status === 'bonding') {
      return side === 'buy' ? quoteBuy(t.curve, amount / t.curve.config.quoteUsd).tokensOut : quoteSell(t.curve, amount).quoteOut * t.curve.config.quoteUsd
    }
    const pool = poolFromLiquidity(t.market.liquidityUsd, t.market.priceUsd)
    return side === 'buy' ? quotePoolBuy(pool, amount).amountOut : quotePoolSell(pool, amount).amountOut
  }

  recordLaunch(address: string, token: MarketToken, hash: string) {
    const acc = this.account(address)
    acc.history.unshift({
      id: `launch-${token.token.address}`, hash, chain: token.token.chain, tokenAddress: token.token.address, symbol: token.token.symbol,
      type: 'launch', amountUsd: 0, amountToken: 0, priceUsd: token.market.priceUsd, wallet: address, timestamp: Date.now(), status: 'confirmed', source: 'demo',
    })
  }

  creditPosition(address: string, key: string, trade: MarketTrade) {
    const acc = this.account(address)
    const pos = acc.positions.get(key) ?? { amount: 0, costUsd: 0 }
    acc.positions.set(key, { amount: pos.amount + trade.amountToken, costUsd: pos.costUsd + trade.amountUsd })
    acc.cashUsd = Math.max(0, acc.cashUsd - trade.amountUsd)
    acc.history.unshift({ ...trade, type: 'buy' })
  }

  walletHistory(address: string): WalletTransaction[] {
    this.sync()
    return [...this.account(address).history]
  }

  portfolio(address: string): Portfolio {
    this.sync()
    const acc = this.account(address)
    const holdings: Holding[] = []
    for (const [key, pos] of acc.positions) {
      const t = this.tokens.get(key)
      if (!t) continue
      const valueUsd = pos.amount * t.market.priceUsd
      holdings.push({
        chain: t.token.chain, tokenAddress: t.token.address, symbol: t.token.symbol, name: t.token.name, logoUrl: t.token.logoUrl,
        amount: pos.amount, avgCostUsd: pos.costUsd / pos.amount, priceUsd: t.market.priceUsd, valueUsd,
        change24h: t.market.priceChange.h24, pnlUsd: valueUsd - pos.costUsd, pnlPct: pos.costUsd > 0 ? (valueUsd / pos.costUsd - 1) * 100 : 0,
      })
    }
    holdings.sort((a, b) => b.valueUsd - a.valueUsd)
    const tokenValue = holdings.reduce((s, h) => s + h.valueUsd, 0)
    const total = acc.cashUsd + tokenValue
    const prevTokenValue = holdings.reduce((s, h) => s + h.valueUsd / (1 + h.change24h / 100), 0)
    const change = tokenValue - prevTokenValue
    const unrealized = holdings.reduce((s, h) => s + h.pnlUsd, 0)
    return {
      address: acc.address,
      source: 'demo',
      cashUsd: acc.cashUsd,
      holdings,
      totalValueUsd: total,
      change24hUsd: change,
      change24hPct: total - change > 0 ? (change / (total - change)) * 100 : 0,
      realizedPnlUsd: acc.realizedPnlUsd,
      unrealizedPnlUsd: unrealized,
      history: this.portfolioHistory(acc, total),
      notes: ['Demo wallet — balances and trades are simulated and hold no real value.'],
    }
  }

  /** Synthetic 30-day equity curve ending at the current total (demo only). */
  private portfolioHistory(acc: DemoAccount, total: number): { time: number; value: number }[] {
    const rng = rngFor(`history:${acc.address.toLowerCase()}`)
    const points = 60
    const now = Math.floor(Date.now() / 1000)
    const values: number[] = []
    let v = 0
    for (let i = 0; i < points; i++) { v += gaussian(rng) * 0.03; values.push(v) }
    const last = values[points - 1] ?? 0
    const start = Math.log(acc.startValue)
    const end = Math.log(Math.max(total, 1))
    return values.map((w, i) => ({
      time: now - (points - 1 - i) * 43_200,
      value: Math.exp(start + (end - start) * (i / (points - 1)) + w - last * (i / (points - 1))),
    }))
  }
}

const g = globalThis as unknown as { __achilyonEngine?: DemoEngine }

/** Process-wide singleton (survives Next.js dev hot reloads). */
export function getEngine(): DemoEngine {
  if (!g.__achilyonEngine) g.__achilyonEngine = new DemoEngine()
  return g.__achilyonEngine
}
