/**
 * Simple Trending Algorithm
 * Scores tokens based on:
 * - Volume spike (24h volume vs liquidity)
 * - Price change (24h)
 * - Number of transactions (if available)
 */
export function calculateTrendingScore(pair) {
  let score = 0

  // Volume to Liquidity Ratio (Higher is better for trending)
  const volume = pair.volume?.h24 || 0
  const liquidity = pair.liquidity?.usd || 1
  const volLiqRatio = volume / liquidity
  score += Math.min(volLiqRatio * 10, 50) // Max 50 points from ratio

  // Price Momentum
  const priceChange = pair.priceChange?.h24 || 0
  if (priceChange > 0) {
    score += Math.min(priceChange, 30) // Max 30 points from price growth
  }

  // Activity (Buys/Sells)
  const totalTxs = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0)
  score += Math.min(totalTxs / 100, 20) // Max 20 points from activity

  return Math.round(score)
}

export function sortPairsByTrending(pairs) {
  return [...pairs].sort((a, b) => {
    const scoreA = calculateTrendingScore(a)
    const scoreB = calculateTrendingScore(b)
    return scoreB - scoreA
  })
}
