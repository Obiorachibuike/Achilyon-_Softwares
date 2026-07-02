export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const buysH24 = parseInt(pair.txns?.h24?.buys || 0);
  const sellsH24 = parseInt(pair.txns?.h24?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume spike (1h vs average hourly volume in 24h) - max 40 pts
  const hourlyAvg = volumeH24 / 24 || 1;
  const volumeWeight = Math.min((volumeH1 / hourlyAvg) * 5, 40);

  // 2. Buy/Sell pressure ratio - max 30 pts
  const totalTxns = buysH24 + sellsH24;
  const buyRatio = totalTxns > 0 ? buysH24 / totalTxns : 0.5;
  const pressureWeight = buyRatio * 30;

  // 3. Absolute transaction activity - max 20 pts
  const activityWeight = Math.min(totalTxns / 100, 20);

  // 4. Liquidity factor - max 10 pts
  const liquidityWeight = Math.min(liquidity / 50000, 10);

  return Math.floor(volumeWeight + pressureWeight + activityWeight + liquidityWeight);
}
