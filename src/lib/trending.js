export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const txnsH1 = parseInt(pair.txns?.h1?.buys || 0) + parseInt(pair.txns?.h1?.sells || 0);
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume Momentum (max 40 pts)
  // Compares 1h volume to average hourly volume of the last 24h
  const avgHourlyVol = volumeH24 / 24 || 1;
  const volumeSpike = volumeH1 / avgHourlyVol;
  const volumeScore = Math.min(volumeSpike * 5, 40);

  // 2. Buy/Sell Pressure Ratio (max 30 pts)
  const totalTxns = buysH1 + sellsH1;
  const buyRatio = totalTxns > 0 ? buysH1 / totalTxns : 0.5;
  const pressureScore = buyRatio * 30;

  // 3. Transaction Activity (max 20 pts)
  // Higher frequency of trades indicates more interest
  const activityScore = Math.min(txnsH1 / 10, 20);

  // 4. Liquidity Health (max 10 pts)
  // Bonus for pools with healthy liquidity (reduces rug risk)
  const liquidityScore = Math.min(liquidity / 50000, 10);

  return Math.floor(volumeScore + pressureScore + activityScore + liquidityScore);
}
