export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  // 1. Volume Momentum (Max 40 points)
  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const avgHourlyVolume = volumeH24 / 24;
  // Score based on how much current hour volume exceeds average
  const volumeMomentum = avgHourlyVolume > 0 ? (volumeH1 / avgHourlyVolume) : 0;
  // If volumeH1 is significantly higher than average, boost score
  const volumeScore = Math.min(volumeMomentum * 10, 40);

  // 2. Buy/Sell Pressure Ratio (Max 30 points)
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0);
  const totalTxnsH1 = buysH1 + sellsH1;
  const buyRatio = totalTxnsH1 > 0 ? (buysH1 / totalTxnsH1) : 0.5;
  const buyPressureScore = buyRatio * 30;

  // 3. Transaction Activity (Max 20 points)
  // Scoring based on raw number of transactions in the last hour
  const txnActivityScore = Math.min(totalTxnsH1, 20);

  // 4. Liquidity Health (Max 10 points)
  const liquidity = parseFloat(pair.liquidity?.usd || 0);
  // Reward pairs with healthy liquidity (over $50k)
  const liquidityScore = Math.min(liquidity / 5000, 10);

  const totalScore = Math.floor(volumeScore + buyPressureScore + txnActivityScore + liquidityScore);

  return Math.min(totalScore, 100);
}
