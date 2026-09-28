/**
 * Heuristic momentum score for a DexScreener pair.
 * Rewards hourly volume spikes relative to the 24h average, buy pressure and
 * reasonable liquidity. Output is an unbounded positive integer; higher = hotter.
 */
export function calculateTrendingScore(pair) {
  if (!pair) return 0

  const volumeH1 = parseFloat(pair.volume?.h1 || 0)
  const volumeH24 = parseFloat(pair.volume?.h24 || 0)
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0, 10)
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0, 10)
  const liquidity = parseFloat(pair.liquidity?.usd || 0)

  const hourlyAverage = volumeH24 / 24
  const volumeWeight = hourlyAverage > 0 ? Math.min((volumeH1 / hourlyAverage) * 10, 60) : 0
  const buyWeight = Math.min(buysH1 * 0.5, 40) + (buysH1 > sellsH1 ? 5 : 0)
  const liquidityWeight = Math.min(liquidity / 10000, 20)

  return Math.floor(volumeWeight + buyWeight + liquidityWeight)
}
