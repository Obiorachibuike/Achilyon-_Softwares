import type { MarketToken } from '@/types'

/**
 * Market-structure risk signals derived from the data we actually have.
 * These are heuristics, not guarantees — a token without warnings is not
 * "safe". Contract-level checks (honeypot, taxes, authorities) live in
 * `security.ts` and require the GoPlus API.
 */

export type RiskLevel = 'info' | 'warn' | 'danger'

export interface RiskSignal {
  id: string
  level: RiskLevel
  label: string
  detail: string
}

export function marketRiskSignals(t: MarketToken, now = Date.now()): RiskSignal[] {
  const m = t.market
  const out: RiskSignal[] = []
  const ageHours = (now - t.token.createdAt) / 3_600_000
  if (!t.token.verified) out.push({ id: 'unverified', level: 'warn', label: 'Unverified', detail: 'Achilyon has not verified this token’s contract or team.' })
  if (t.token.status === 'bonding') out.push({ id: 'bonding', level: 'info', label: 'On bonding curve', detail: 'Price is set by the curve; liquidity is virtual until migration.' })
  else if (m.liquidityUsd < 10_000) out.push({ id: 'low-liq', level: 'danger', label: 'Very low liquidity', detail: 'Under $10K of liquidity — large orders will move price heavily and may be hard to exit.' })
  else if (m.liquidityUsd < 50_000) out.push({ id: 'thin-liq', level: 'warn', label: 'Thin liquidity', detail: 'Under $50K of liquidity — expect high slippage.' })
  if (ageHours < 24) out.push({ id: 'new', level: 'warn', label: 'New token', detail: `Created ${Math.max(1, Math.round(ageHours))}h ago. New tokens are extremely volatile.` })
  if (Math.abs(m.priceChange.h24) > 50) out.push({ id: 'volatile', level: 'warn', label: 'High volatility', detail: `${m.priceChange.h24 > 0 ? 'Up' : 'Down'} ${Math.abs(m.priceChange.h24).toFixed(0)}% in 24h.` })
  if (m.liquidityUsd > 0 && t.token.status !== 'bonding') {
    const ratio = m.fdv / m.liquidityUsd
    if (ratio > 50) out.push({ id: 'fdv-liq', level: 'danger', label: 'Valuation far above liquidity', detail: `FDV is ${ratio.toFixed(0)}× liquidity.` })
    const turnover = m.volume.h24 / m.liquidityUsd
    if (turnover > 25) out.push({ id: 'wash', level: 'warn', label: 'Unusual turnover', detail: `24h volume is ${turnover.toFixed(0)}× liquidity — possible wash trading.` })
  }
  const { buys, sells } = m.txns.h24
  if (buys + sells > 30 && sells / (buys + sells) > 0.65) out.push({ id: 'sell-pressure', level: 'warn', label: 'Sell pressure', detail: `${sells} sells vs ${buys} buys in 24h.` })
  if (!t.token.socials.website && !t.token.socials.twitter && !t.token.socials.telegram) out.push({ id: 'no-socials', level: 'info', label: 'No project links', detail: 'No website or social channels listed.' })
  return out
}

export function riskLevel(signals: RiskSignal[]): RiskLevel | 'low' {
  if (signals.some((s) => s.level === 'danger')) return 'danger'
  if (signals.filter((s) => s.level === 'warn').length >= 2) return 'warn'
  return signals.some((s) => s.level === 'warn') ? 'info' : 'low'
}
