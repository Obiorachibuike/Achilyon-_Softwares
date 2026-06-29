/**
 * Calculates a trending score for a token pair based on various metrics.
 * Score range: 0 - 100
 */
export const calculateTrendingScore = (pair) => {
  if (!pair) return 0;

  let score = 0;

  // 1. Volume Factor (Up to 40 points)
  // Higher volume relative to liquidity indicates high interest
  const volume24h = parseFloat(pair.volume?.h24 || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 1);
  const volLiqRatio = volume24h / liquidity;

  if (volLiqRatio > 5) score += 40;
  else if (volLiqRatio > 2) score += 30;
  else if (volLiqRatio > 1) score += 20;
  else if (volLiqRatio > 0.5) score += 10;

  // 2. Buy/Sell Pressure (Up to 30 points)
  const buys = parseInt(pair.txns?.h24?.buys || 0);
  const sells = parseInt(pair.txns?.h24?.sells || 0);
  const totalTxns = buys + sells;

  if (totalTxns > 0) {
    const buyRatio = buys / totalTxns;
    if (buyRatio > 0.7) score += 30;
    else if (buyRatio > 0.6) score += 20;
    else if (buyRatio > 0.5) score += 10;
  }

  // 3. Price Change (Up to 20 points)
  const priceChange24h = parseFloat(pair.priceChange?.h24 || 0);
  if (priceChange24h > 50) score += 20;
  else if (priceChange24h > 20) score += 15;
  else if (priceChange24h > 5) score += 10;
  else if (priceChange24h > 0) score += 5;

  // 4. Activity/Recency (Up to 10 points)
  // More recent pairs get a small boost if they have activity
  const pairAgeHours = (Date.now() - pair.pairCreatedAt) / 1000 / 60 / 60;
  if (pairAgeHours < 24 && totalTxns > 100) score += 10;
  else if (pairAgeHours < 72 && totalTxns > 50) score += 5;

  return Math.min(100, score);
};
