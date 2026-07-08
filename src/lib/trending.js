export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume Momentum (Max 40 pts)
  // Reward volume spikes relative to 24h average
  const avgHourlyVol = volumeH24 / 24;
  const volMomentum = avgHourlyVol > 0 ? (volumeH1 / avgHourlyVol) * 5 : 0;
  const volumeScore = Math.min(volMomentum, 40);

  // 2. Buy/Sell Pressure (Max 30 pts)
  const totalTxnsH1 = buysH1 + sellsH1;
  const buyRatio = totalTxnsH1 > 0 ? buysH1 / totalTxnsH1 : 0.5;
  const pressureScore = buyRatio * 30;

  // 3. Activity Level (Max 20 pts)
  const activityScore = Math.min(totalTxnsH1 / 10, 20);

  // 4. Liquidity Health (Max 10 pts)
  const liquidityScore = Math.min(liquidity / 50000, 10);

  return Math.floor(volumeScore + pressureScore + activityScore + liquidityScore);
}
