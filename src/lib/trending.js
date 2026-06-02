export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const txnsH1 = pair.txns?.h1 || { buys: 0, sells: 0 };
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume spike (1h vs average hourly of 24h)
  const volumeWeight = (volumeH1 / (volumeH24 / 24 || 1)) * 15;

  // 2. Buy pressure (ratio of buys to total txns)
  const totalTxns = txnsH1.buys + txnsH1.sells;
  const buyPressureWeight = totalTxns > 0 ? (txnsH1.buys / totalTxns) * 50 : 0;

  // 3. Activity volume (raw transaction count)
  const activityWeight = Math.min(totalTxns * 2, 30);

  // 4. Liquidity factor (prefers decent liquidity but caps influence)
  const liquidityWeight = Math.min(liquidity / 5000, 25);

  return Math.floor(volumeWeight + buyPressureWeight + activityWeight + liquidityWeight);
}
