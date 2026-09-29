import type { Candle } from '@/types'

/** Pure transforms from price candles to the chart's alternative modes. */

export type ChartMode = 'price' | 'mcap' | 'liquidity' | 'volume'

export interface LinePoint { time: number; value: number }

/** Market cap scales linearly with price for a fixed circulating supply. */
export function marketCapSeries(candles: Candle[], currentPrice: number, currentMcap: number): LinePoint[] {
  if (!(currentPrice > 0)) return []
  const supply = currentMcap / currentPrice
  return candles.map((c) => ({ time: c.time, value: c.close * supply }))
}

/**
 * Estimated historical pool liquidity. For a constant-product pool without
 * deposits/withdrawals, the USD value of reserves scales with √price:
 * L(t) ≈ L_now · √(p(t) / p_now). This is an estimate — LP adds/removals are
 * not visible in candle data — and the UI labels it as such.
 */
export function liquiditySeries(candles: Candle[], currentPrice: number, currentLiquidity: number): LinePoint[] {
  if (!(currentPrice > 0) || !(currentLiquidity > 0)) return []
  return candles.map((c) => ({ time: c.time, value: currentLiquidity * Math.sqrt(Math.max(c.close, 0) / currentPrice) }))
}

/** Change between the first open and last close of the visible range. */
export function rangeChange(candles: Candle[]): number | null {
  const first = candles[0]
  const last = candles[candles.length - 1]
  if (!first || !last || !(first.open > 0)) return null
  return ((last.close - first.open) / first.open) * 100
}
