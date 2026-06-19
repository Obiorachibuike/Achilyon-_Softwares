/**
 * Calculates a trending score for a token pair based on volume, buy pressure, and liquidity.
 *
 * Formula considers:
 * 1. Volume spike: 1h volume compared to 24h volume
 * 2. Buy pressure: Ratio of buys to total transactions in the last hour
 * 3. Liquidity factor: Normalized liquidity value
 */
export const calculateTrendScore = (pair) => {
  if (!pair) return 0;

  const v1h = parseFloat(pair.volume?.h1 || 0);
  const v24h = parseFloat(pair.volume?.h24 || 0);
  const buys1h = parseInt(pair.txns?.h1?.buys || 0);
  const sells1h = parseInt(pair.txns?.h1?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume Spike Score (0-40 points)
  // Higher weight if 1h volume is a large portion of 24h volume
  const volumeRatio = v24h > 0 ? (v1h / (v24h / 24)) : 1;
  const volumeScore = Math.min(40, volumeRatio * 5);

  // 2. Buy Pressure Score (0-40 points)
  const totalTx1h = buys1h + sells1h;
  const buyRatio = totalTx1h > 0 ? (buys1h / totalTx1h) : 0.5;
  const buyScore = buyRatio * 40;

  // 3. Liquidity Score (0-20 points)
  // Weighted towards pairs with at least some liquidity
  const liquidityScore = Math.min(20, (liquidity / 10000) * 2);

  return Math.round(volumeScore + buyScore + liquidityScore);
};
