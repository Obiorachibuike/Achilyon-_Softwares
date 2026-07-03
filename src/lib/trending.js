/**
 * Calculates a trending score for a given pair.
 * The score is between 0 and 100.
 *
 * Weights:
 * - Volume Spike (24h): 40%
 * - Buy/Sell Pressure (24h): 30%
 * - Transaction Activity (24h): 20%
 * - Liquidity Factor: 10%
 */
export const calculateTrendingScore = (pair) => {
    if (!pair) return 0;

    // 1. Volume Spike (relative to a mock baseline or just raw magnitude for discovery)
    const volume = parseFloat(pair.volume?.h24 || 0);
    const volumeScore = Math.min((volume / 100000) * 40, 40); // Max 40 pts for 100k+ volume

    // 2. Buy/Sell Pressure
    const buys = parseInt(pair.txns?.h24?.buys || 0);
    const sells = parseInt(pair.txns?.h24?.sells || 0);
    const totalTxns = buys + sells;
    let buyPressureScore = 0;
    if (totalTxns > 0) {
      const buyRatio = buys / totalTxns;
      buyPressureScore = buyRatio * 30; // Max 30 pts for 100% buys
    }

    // 3. Transaction Activity
    const txnScore = Math.min((totalTxns / 500) * 20, 20); // Max 20 pts for 500+ txns

    // 4. Liquidity Factor (Higher liquidity is safer/more trending for some)
    const liquidity = parseFloat(pair.liquidity?.usd || 0);
    const liquidityScore = Math.min((liquidity / 50000) * 10, 10); // Max 10 pts for 50k+ liquidity

    const totalScore = volumeScore + buyPressureScore + txnScore + liquidityScore;
    return Math.round(totalScore);
  };
