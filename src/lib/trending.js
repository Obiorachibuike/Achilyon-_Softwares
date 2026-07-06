export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // Advanced scoring algorithm (0-100 scale)

  // 1. Volume momentum (Max 40 points)
  // Compares 1h volume to average hourly volume
  const avgHourlyVol = volumeH24 / 24 || 1;
  const volMomentum = Math.min((volumeH1 / avgHourlyVol) * 5, 40);

  // 2. Buy pressure (Max 30 points)
  const totalTxnsH1 = buysH1 + sellsH1;
  const buyRatio = totalTxnsH1 > 0 ? buysH1 / totalTxnsH1 : 0.5;
  const buyPressure = buyRatio * 30;

  // 3. Activity intensity (Max 20 points)
  const activity = Math.min(totalTxnsH1 / 10, 20);

  // 4. Liquidity health (Max 10 points)
  const liquidityScore = Math.min(liquidity / 50000, 10);

  const totalScore = Math.floor(volMomentum + buyPressure + activity + liquidityScore);
  return Math.min(totalScore, 100);
}
