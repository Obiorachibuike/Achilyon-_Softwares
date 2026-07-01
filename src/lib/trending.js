/**
 * Calculates a trending score for a token pair based on volume, liquidity, and buy/sell pressure.
 * Returns a score between 0 and 100.
 */
export const calculateTrendingScore = (pair) => {
  if (!pair) return 0;

  let score = 0;

  // 1. Volume Factor (up to 40 pts)
  // Higher volume relative to liquidity is often a sign of trending
  const h24Volume = parseFloat(pair.volume?.h24 || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 1); // Avoid div by zero

  const volToLiqRatio = h24Volume / liquidity;
  if (volToLiqRatio > 2) score += 40;
  else if (volToLiqRatio > 1) score += 30;
  else if (volToLiqRatio > 0.5) score += 20;
  else if (volToLiqRatio > 0.1) score += 10;

  // 2. Buy/Sell Pressure (up to 30 pts)
  const buys = parseInt(pair.txns?.h24?.buys || 0);
  const sells = parseInt(pair.txns?.h24?.sells || 0);
  const totalTxns = buys + sells;

  if (totalTxns > 0) {
    const buyRatio = buys / totalTxns;
    if (buyRatio > 0.8) score += 30;
    else if (buyRatio > 0.6) score += 20;
    else if (buyRatio > 0.5) score += 10;
  }

  // 3. Activity Factor (up to 20 pts)
  // Recent transactions (1h)
  const h1Txns = parseInt(pair.txns?.h1?.buys || 0) + parseInt(pair.txns?.h1?.sells || 0);
  if (h1Txns > 500) score += 20;
  else if (h1Txns > 100) score += 15;
  else if (h1Txns > 20) score += 10;
  else if (h1Txns > 0) score += 5;

  // 4. Liquidity Floor (up to 10 pts)
  // We prefer pairs with decent liquidity
  if (liquidity > 100000) score += 10;
  else if (liquidity > 10000) score += 5;

  return Math.min(score, 100);
};

export const sortPairs = (pairs, sortBy) => {
  return [...pairs].sort((a, b) => {
    switch (sortBy) {
      case 'mcap':
        return (b.fdv || 0) - (a.fdv || 0);
      case 'volume':
        return (b.volume?.h24 || 0) - (a.volume?.h24 || 0);
      case 'age':
        return (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0);
      case 'trending':
      default:
        return (b.trendingScore || 0) - (a.trendingScore || 0);
    }
  });
};
