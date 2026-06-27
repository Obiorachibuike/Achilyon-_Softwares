/**
 * Trending Algorithm
 *
 * Scores tokens based on:
 * - Volume spikes (24h volume relative to liquidity)
 * - Buy/Sell ratio (transaction pressure)
 * - Transaction activity
 * - Liquidity depth
 */

export function calculateTrendScore(pair) {
  if (!pair) return 0;

  let score = 0;

  // 1. Volume Factor (Max 40 points)
  // Higher volume relative to liquidity indicates high interest
  const volume24h = pair.volume?.h24 || 0;
  const liquidity = pair.liquidity?.usd || 1; // avoid div by zero
  const volToLiqRatio = volume24h / liquidity;

  if (volToLiqRatio > 10) score += 40;
  else if (volToLiqRatio > 5) score += 30;
  else if (volToLiqRatio > 2) score += 20;
  else if (volToLiqRatio > 1) score += 10;
  else if (volToLiqRatio > 0.5) score += 5;

  // 2. Buy/Sell Pressure (Max 30 points)
  const buys = pair.txns?.h24?.buys || 0;
  const sells = pair.txns?.h24?.sells || 0;
  const totalTxns = buys + sells;

  if (totalTxns > 0) {
    const buyRatio = buys / totalTxns;
    if (buyRatio > 0.8) score += 30;
    else if (buyRatio > 0.7) score += 20;
    else if (buyRatio > 0.6) score += 10;
    else if (buyRatio > 0.5) score += 5;
  }

  // 3. Activity Factor (Max 20 points)
  if (totalTxns > 5000) score += 20;
  else if (totalTxns > 1000) score += 15;
  else if (totalTxns > 500) score += 10;
  else if (totalTxns > 100) score += 5;

  // 4. Liquidity Health (Max 10 points)
  if (liquidity > 1000000) score += 10;
  else if (liquidity > 100000) score += 7;
  else if (liquidity > 50000) score += 5;
  else if (liquidity > 10000) score += 2;

  return Math.min(100, score);
}

export function sortPairsByTrend(pairs) {
  return [...pairs].sort((a, b) => calculateTrendScore(b) - calculateTrendScore(a));
}
