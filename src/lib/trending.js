/**
 * Calculates a trending score for a pair based on volume, buy pressure, and liquidity.
 * @param {Object} pair - The pair data from DexScreener
 * @returns {number} - A calculated score
 */
export function calculateTrendingScore(pair) {
  if (!pair) return 0;

  const volumeH1 = parseFloat(pair.volume?.h1 || 0);
  const volumeH24 = parseFloat(pair.volume?.h24 || 0);
  const buysH1 = parseInt(pair.txns?.h1?.buys || 0);
  const sellsH1 = parseInt(pair.txns?.h1?.sells || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);

  // 1. Volume spike (1h vs 24h average)
  const avgHourlyVol = volumeH24 / 24 || 1;
  const volumeWeight = Math.min((volumeH1 / avgHourlyVol) * 5, 50);

  // 2. Buy pressure (ratio of buys to total transactions in 1h)
  const totalTxnsH1 = buysH1 + sellsH1;
  const buyRatio = totalTxnsH1 > 0 ? (buysH1 / totalTxnsH1) : 0.5;
  const buyWeight = buyRatio * 30;

  // 3. Liquidity factor
  const liquidityWeight = Math.min(liquidity / 20000, 20);

  // 4. Transaction activity
  const activityWeight = Math.min(totalTxnsH1 / 10, 10);

  return Math.floor(volumeWeight + buyWeight + liquidityWeight + activityWeight);
}
