export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const txnsH1 = parseInt(pair.txns?.h1?.buys || 0) + parseInt(pair.txns?.h1?.sells || 0);
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // Advanced scoring algorithm
  // 1. Volume spike (1h vs 24h average)
  // Weighted: 40%
  const hourlyAvg24h = volumeH24 / 24;
  const volumeSpike = hourlyAvg24h > 0 ? (volumeH1 / hourlyAvg24h) : 1;
  const volumeWeight = Math.min(volumeSpike * 5, 40);

  // 2. Buy/Sell Ratio & Pressure
  // Weighted: 30%
  const totalTxns = buysH1 + sellsH1;
  const buyRatio = totalTxns > 0 ? (buysH1 / totalTxns) : 0.5;
  const buyWeight = (buyRatio * 20) + (Math.min(buysH1 / 10, 10));

  // 3. Liquidity Depth
  // Weighted: 20%
  // Prefer liquidity between $10k and $100k for "trending" microcaps
  const liquidityWeight = Math.min(liquidity / 5000, 20);

  // 4. Activity (Transaction count)
  // Weighted: 10%
  const activityWeight = Math.min(txnsH1 / 5, 10);

  const totalScore = Math.floor(volumeWeight + buyWeight + liquidityWeight + activityWeight);

  return totalScore;
}
