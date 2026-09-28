import { formatUsdCompact } from './utils.js'

/** Rule-based market read for a pair. Heuristic only — not a model output. */
export function summarize(token) {
  const vol = parseFloat(token.volume?.h24 || 0)
  const liq = parseFloat(token.liquidity?.usd || 0)
  const buys = parseInt(token.txns?.h24?.buys || 0, 10)
  const sells = parseInt(token.txns?.h24?.sells || 0, 10)
  const change = parseFloat(token.priceChange?.h24 || 0)
  const symbol = token.baseToken?.symbol ?? 'This token'
  const notes = []

  if (liq < 50_000) notes.push(`Liquidity is thin (${formatUsdCompact(liq)}), so expect heavy slippage on size.`)
  if (vol > 1_000_000 && buys > sells * 1.3) notes.push(`Strong demand: ${formatUsdCompact(vol)} traded with buyers outnumbering sellers ${(buys / Math.max(sells, 1)).toFixed(1)}:1.`)
  else if (sells > buys * 1.3 && buys + sells > 50) notes.push(`Sell pressure dominates (${sells.toLocaleString()} sells vs ${buys.toLocaleString()} buys).`)
  if (Math.abs(change) > 30) notes.push(`Highly volatile — ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(0)}% in 24h.`)
  if (liq > 0 && vol / liq > 20) notes.push('Volume is very high relative to liquidity; watch for wash trading.')
  if (!notes.length) notes.push(`${symbol} shows steady activity with liquidity and volume in normal ranges.`)
  return notes
}
