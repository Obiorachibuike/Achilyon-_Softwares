import type { BondingCurveSnapshot } from '@/types'
import type { CurveConfig, CurveState, CurveSummary } from './types'
import { getPricingModel } from './pricing'
import { curveProgress, remainingCurveTokens } from './calculations'

export const DEFAULT_TOTAL_SUPPLY = 1_000_000_000
/** Target starting market cap (USD) for new curves. */
export const DEFAULT_START_MCAP_USD = 5_000

/**
 * Default Achilyon curve: 80% of supply is sold on the curve, 20% is reserved
 * for DEX liquidity at migration. Virtual reserves are sized so that the
 * starting market cap is ≈ $5K regardless of the quote asset's price.
 */
export function defaultCurveConfig(quoteSymbol: string, quoteUsd: number, overrides: Partial<CurveConfig> = {}): CurveConfig {
  const totalSupply = overrides.totalSupply ?? DEFAULT_TOTAL_SUPPLY
  const curveSupply = overrides.curveSupply ?? totalSupply * 0.8
  const virtualTokenReserve = overrides.virtualTokenReserve ?? totalSupply * 1.08
  // price₀ = X₀/Y₀ ; mcap₀ = price₀ · supply · quoteUsd
  const virtualQuoteReserve = overrides.virtualQuoteReserve ?? (DEFAULT_START_MCAP_USD * virtualTokenReserve) / (totalSupply * quoteUsd)
  const basePrice = overrides.basePrice ?? DEFAULT_START_MCAP_USD / totalSupply / quoteUsd
  return {
    kind: 'constant-product',
    totalSupply,
    curveSupply,
    virtualQuoteReserve,
    virtualTokenReserve,
    basePrice,
    slope: overrides.slope ?? (basePrice * 14) / curveSupply,
    feeBps: 100,
    quoteSymbol,
    quoteUsd,
    ...overrides,
  }
}

export function validateCurveConfig(config: CurveConfig): string[] {
  const errors: string[] = []
  if (!(config.totalSupply > 0)) errors.push('Total supply must be positive')
  if (!(config.curveSupply > 0) || config.curveSupply > config.totalSupply) errors.push('Curve supply must be between 0 and total supply')
  if (config.kind === 'constant-product') {
    if (!(config.virtualQuoteReserve > 0)) errors.push('Virtual quote reserve must be positive')
    if (!(config.virtualTokenReserve > config.curveSupply)) errors.push('Virtual token reserve must exceed curve supply')
  } else {
    if (!(config.basePrice > 0)) errors.push('Base price must be positive')
    if (config.slope < 0) errors.push('Slope cannot be negative')
  }
  if (config.feeBps < 0 || config.feeBps > 1000) errors.push('Fee must be between 0 and 10%')
  return errors
}

export function createCurve(config: CurveConfig): CurveState {
  const errors = validateCurveConfig(config)
  if (errors.length) throw new Error(`Invalid curve config: ${errors.join('; ')}`)
  return { config, tokensSold: 0, quoteRaised: 0, migrated: false }
}

/** Curve state after `tokensSold` tokens (used to seed demo data consistently). */
export function curveAt(config: CurveConfig, tokensSold: number): CurveState {
  const sold = Math.min(Math.max(tokensSold, 0), config.curveSupply)
  const model = getPricingModel(config)
  return { config, tokensSold: sold, quoteRaised: model.costBetween(0, sold), migrated: sold >= config.curveSupply }
}

/** Quote raised when the curve completes — the migration threshold. */
export function migrationQuoteTarget(config: CurveConfig): number {
  return getPricingModel(config).costBetween(0, config.curveSupply)
}

export function summarizeCurve(state: CurveState): CurveSummary {
  const { config } = state
  const model = getPricingModel(config)
  const priceQuote = model.spotPrice(state.tokensSold)
  const nextSold = Math.min(config.curveSupply, state.tokensSold + config.curveSupply * 0.01)
  const target = migrationQuoteTarget(config)
  const virtualQuote = config.kind === 'constant-product' ? config.virtualQuoteReserve + state.quoteRaised : state.quoteRaised
  return {
    priceQuote,
    priceUsd: priceQuote * config.quoteUsd,
    nextPriceUsd: model.spotPrice(nextSold) * config.quoteUsd,
    marketCapUsd: priceQuote * config.totalSupply * config.quoteUsd,
    // Both sides of the virtual pool valued in USD.
    virtualLiquidityUsd: virtualQuote * config.quoteUsd * 2,
    progress: curveProgress(state),
    remainingCurveTokens: remainingCurveTokens(state),
    migrationQuoteTarget: target,
    migrationMarketCapUsd: model.spotPrice(config.curveSupply) * config.totalSupply * config.quoteUsd,
    quoteRaised: state.quoteRaised,
    migrated: state.migrated,
  }
}

/** Sampled curve for charts: x = tokens sold, y = market cap in USD. */
export function curvePoints(config: CurveConfig, samples = 64): { sold: number; priceUsd: number; marketCapUsd: number }[] {
  const model = getPricingModel(config)
  return Array.from({ length: samples + 1 }, (_, i) => {
    const sold = (config.curveSupply * i) / samples
    const priceUsd = model.spotPrice(sold) * config.quoteUsd
    return { sold, priceUsd, marketCapUsd: priceUsd * config.totalSupply }
  })
}

export function toSnapshot(state: CurveState): BondingCurveSnapshot {
  const { config } = state
  return {
    kind: config.kind,
    quoteSymbol: config.quoteSymbol,
    quoteUsd: config.quoteUsd,
    totalSupply: config.totalSupply,
    curveSupply: config.curveSupply,
    tokensSold: state.tokensSold,
    quoteRaised: state.quoteRaised,
    virtualQuoteReserve: config.virtualQuoteReserve,
    virtualTokenReserve: config.virtualTokenReserve,
    migrationQuoteTarget: migrationQuoteTarget(config),
    progress: curveProgress(state),
    migrated: state.migrated,
    feeBps: config.feeBps,
  }
}

/** Rebuild a curve state from a serialized snapshot (client-side quoting). */
export function fromSnapshot(s: BondingCurveSnapshot): CurveState {
  const config = defaultCurveConfig(s.quoteSymbol, s.quoteUsd, {
    kind: s.kind,
    totalSupply: s.totalSupply,
    curveSupply: s.curveSupply,
    virtualQuoteReserve: s.virtualQuoteReserve,
    virtualTokenReserve: s.virtualTokenReserve,
    feeBps: s.feeBps,
  })
  return { config, tokensSold: s.tokensSold, quoteRaised: s.quoteRaised, migrated: s.migrated }
}

/**
 * Curve used by the Achilyon launchpad for a new token: `curvePct` of supply
 * is sold on the curve; the virtual token reserve sits 28% of supply above it,
 * which fixes the start/graduation market caps independent of supply.
 */
export function launchCurveConfig(quoteSymbol: string, quoteUsd: number, totalSupply: number, curvePct: number): CurveConfig {
  return defaultCurveConfig(quoteSymbol, quoteUsd, {
    totalSupply,
    curveSupply: totalSupply * (curvePct / 100),
    virtualTokenReserve: totalSupply * (curvePct / 100 + 0.28),
  })
}
