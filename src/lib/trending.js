
/**
 * Calculates a trending score for a token pair based on volume, liquidity, and buy/sell activity.
 * Returns a score between 0 and 100.
 */
export const calculateTrendingScore = (pair) => {
  if (!pair) return 0;

  let score = 0;

  // 1. Volume Factor (up to 40 points)
  // High volume relative to typical new pairs
  const volume24h = parseFloat(pair.volume?.h24 || 0);
  if (volume24h > 1000000) score += 40;
  else if (volume24h > 100000) score += 25;
  else if (volume24h > 10000) score += 10;

  // 2. Buy/Sell Ratio (up to 30 points)
  const buys = parseInt(pair.txns?.h24?.buys || 0);
  const sells = parseInt(pair.txns?.h24?.sells || 0);
  const totalTxns = buys + sells;

  if (totalTxns > 0) {
    const buyRatio = buys / totalTxns;
    if (buyRatio > 0.7) score += 30;
    else if (buyRatio > 0.6) score += 20;
    else if (buyRatio > 0.5) score += 10;
  }

  // 3. Activity Level (up to 20 points)
  if (totalTxns > 5000) score += 20;
  else if (totalTxns > 1000) score += 15;
  else if (totalTxns > 100) score += 5;

  // 4. Liquidity Health (up to 10 points)
  const liquidity = parseFloat(pair.liquidity?.usd || 0);
  if (liquidity > 100000) score += 10;
  else if (liquidity > 10000) score += 5;

  return Math.min(score, 100);
};
