/**
 * Constant-product AMM quoting for tokens that trade in a DEX pool
 * (listed or migrated tokens). Pool reserves are derived from USD liquidity,
 * assuming a balanced 50/50 pool — the standard x·y=k approximation used for
 * price-impact estimates.
 */

export interface PoolQuote {
  amountIn: number
  amountOut: number
  fee: number
  avgPriceUsd: number
  spotPriceUsd: number
  priceImpactPct: number
}

export interface PoolReserves {
  /** USD side of the pool. */
  usdReserve: number
  /** Token side of the pool. */
  tokenReserve: number
}

export function poolFromLiquidity(liquidityUsd: number, priceUsd: number): PoolReserves {
  const usdReserve = Math.max(liquidityUsd, 0) / 2
  return { usdReserve, tokenReserve: priceUsd > 0 ? usdReserve / priceUsd : 0 }
}

/** Buy tokens with `usdIn` (fee taken from input). */
export function quotePoolBuy(pool: PoolReserves, usdIn: number, feeBps = 30): PoolQuote {
  const spot = pool.tokenReserve > 0 ? pool.usdReserve / pool.tokenReserve : 0
  if (!(usdIn > 0) || spot === 0) return { amountIn: usdIn, amountOut: 0, fee: 0, avgPriceUsd: spot, spotPriceUsd: spot, priceImpactPct: 0 }
  const fee = usdIn * (feeBps / 10_000)
  const net = usdIn - fee
  const k = pool.usdReserve * pool.tokenReserve
  const out = pool.tokenReserve - k / (pool.usdReserve + net)
  const avg = net / out
  return { amountIn: usdIn, amountOut: out, fee, avgPriceUsd: avg, spotPriceUsd: spot, priceImpactPct: ((avg - spot) / spot) * 100 }
}

/** Sell `tokensIn` for USD (fee taken from output). */
export function quotePoolSell(pool: PoolReserves, tokensIn: number, feeBps = 30): PoolQuote {
  const spot = pool.tokenReserve > 0 ? pool.usdReserve / pool.tokenReserve : 0
  if (!(tokensIn > 0) || spot === 0) return { amountIn: tokensIn, amountOut: 0, fee: 0, avgPriceUsd: spot, spotPriceUsd: spot, priceImpactPct: 0 }
  const k = pool.usdReserve * pool.tokenReserve
  const gross = pool.usdReserve - k / (pool.tokenReserve + tokensIn)
  const fee = gross * (feeBps / 10_000)
  const avg = gross / tokensIn
  return { amountIn: tokensIn, amountOut: gross - fee, fee, avgPriceUsd: avg, spotPriceUsd: spot, priceImpactPct: ((spot - avg) / spot) * 100 }
}
