export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const vol1h = parseFloat(pair.volume?.h1 || 0);
  const vol24h = parseFloat(pair.volume?.h24 || 0);
  const txns1h = pair.txns?.h1 || { buys: 0, sells: 0 };
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume spike score (up to 40 pts)
  // Higher weight if 1h volume is a large fraction of 24h volume
  const volumeSpike = vol24h > 0 ? (vol1h / (vol24h / 24)) : 0;
  const volumeScore = Math.min(volumeSpike * 5, 40);

  // 2. Buy pressure score (up to 30 pts)
  const totalTxns = (txns1h.buys + txns1h.sells) || 1;
  const buyRatio = txns1h.buys / totalTxns;
  const buyScore = buyRatio * 30;

  // 3. Activity score (up to 20 pts)
  const activityScore = Math.min(totalTxns / 10, 20);

  // 4. Liquidity factor (up to 10 pts)
  // Prefers pools with at least some liquidity
  const liquidityScore = Math.min(liquidity / 50000, 10);

  return Math.floor(volumeScore + buyScore + activityScore + liquidityScore);
}
