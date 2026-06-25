export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume spike (1h vs 24h avg)
  // We compare current hour volume to the average hourly volume over 24h
  const avgVolH1 = volumeH24 / 24;
  const volumeWeight = avgVolH1 > 0 ? Math.min((volumeH1 / avgVolH1) * 5, 40) : 10;

  // 2. Buy pressure (1h)
  const totalTxnsH1 = buysH1 + sellsH1;
  const buyRatio = totalTxnsH1 > 0 ? (buysH1 / totalTxnsH1) : 0.5;
  const pressureWeight = buyRatio * 30;

  // 3. Activity (transaction frequency)
  const activityWeight = Math.min(totalTxnsH1 / 5, 20);

  // 4. Liquidity stability factor
  // Logarithmic scale for liquidity: $1k = ~6pts, $10k = ~8pts, $50k+ = 10pts
  const liquidityWeight = Math.min(Math.log10(liquidity + 1) * 2, 10);

  return Math.floor(volumeWeight + pressureWeight + activityWeight + liquidityWeight);
}
