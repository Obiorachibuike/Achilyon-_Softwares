export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // Basic scoring algorithm
  // 1. Volume spike (1h vs average 1h volume derived from 24h)
  const avgH1Volume = volumeH24 / 24 || 1;
  const volumeWeight = Math.min((volumeH1 / avgH1Volume) * 5, 40);

  // 2. Buy pressure (ratio of buys in 1h)
  const totalTxnsH1 = buysH1 + sellsH1 || 1;
  const buyRatio = buysH1 / totalTxnsH1;
  const buyWeight = buyRatio * 30;

  // 3. Liquidity factor (prefers decent liquidity)
  // Logarithmic scale for liquidity up to 50k
  const liquidityWeight = Math.min(Math.log10(liquidity + 1) * 5, 30);

  return Math.floor(volumeWeight + buyWeight + liquidityWeight);
}
