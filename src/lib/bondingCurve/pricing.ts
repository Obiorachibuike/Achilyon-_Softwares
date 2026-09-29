import type { CurveConfig, PricingModel } from './types'

/**
 * Constant-product curve with virtual reserves.
 *
 *   X · Y = k,  X = X₀ + quoteRaised,  Y = Y₀ − sold
 *   spot(s)  = X / Y = k / (Y₀ − s)²
 *   cost(a→b) = k/(Y₀ − b) − k/(Y₀ − a)
 *
 * Virtual reserves give the curve a non-zero starting price and depth without
 * any real liquidity being deposited.
 */
export function constantProductModel(config: CurveConfig): PricingModel {
  const x0 = config.virtualQuoteReserve
  const y0 = config.virtualTokenReserve
  const k = x0 * y0
  return {
    spotPrice: (sold) => k / (y0 - sold) ** 2,
    costBetween: (from, to) => k / (y0 - to) - k / (y0 - from),
    tokensForQuote: (sold, quote) => {
      if (quote <= 0) return 0
      const y = y0 - sold
      const x = k / y
      return y - k / (x + quote)
    },
  }
}

/**
 * Linear curve: price rises by `slope` for every token sold.
 *
 *   spot(s)   = p₀ + m·s
 *   cost(a→b) = p₀(b − a) + m/2 (b² − a²)
 *   tokensForQuote solves m/2·d² + (p₀ + m·s)·d − q = 0 for d.
 */
export function linearModel(config: CurveConfig): PricingModel {
  const p0 = config.basePrice
  const m = config.slope
  return {
    spotPrice: (sold) => p0 + m * sold,
    costBetween: (from, to) => p0 * (to - from) + (m / 2) * (to * to - from * from),
    tokensForQuote: (sold, quote) => {
      if (quote <= 0) return 0
      const b = p0 + m * sold
      if (m === 0) return quote / b
      return (-b + Math.sqrt(b * b + 2 * m * quote)) / m
    },
  }
}

export function getPricingModel(config: CurveConfig): PricingModel {
  return config.kind === 'linear' ? linearModel(config) : constantProductModel(config)
}
