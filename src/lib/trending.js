export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const txnsH1 = pair.txns?.h1 || { buys: 0, sells: 0 };
  const buysH1 = parseInt(txnsH1.buys || 0);
  const sellsH1 = parseInt(txnsH1.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume Velocity (1h vs 24h average)
  const avgVolH1 = volumeH24 / 24 || 1;
  const volVelocity = volumeH1 / avgVolH1; // How many times above average 1h volume is
  const volumeScore = Math.min(volVelocity * 15, 60);

  // 2. Buy Pressure Ratio
  const totalTxns = buysH1 + sellsH1;
  const buyRatio = totalTxns > 0 ? (buysH1 / totalTxns) : 0.5;
  const pressureScore = buyRatio * 25;

  // 3. Liquidity Depth (Logarithmic scale)
  // Prefers pools with $5k - $50k for "trending" potential, caps at $50k for this metric
  const liqScore = Math.min(Math.log10(liquidity + 1) * 3, 15);

  return Math.floor(volumeScore + pressureScore + liqScore);
}
