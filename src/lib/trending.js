export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // Basic scoring algorithm
  // 1. Volume spike (1h vs 24h)
  const volumeWeight = (volumeH1 / (volumeH24 / 24 || 1)) * 10;

  // 2. Buy pressure
  const buyWeight = buysH1 * 2;

  // 3. Liquidity factor (prefers decent liquidity but doesn't penalize new pools too much)
  const liquidityWeight = Math.min(liquidity / 10000, 20);

  return Math.floor(volumeWeight + buyWeight + liquidityWeight);
}
