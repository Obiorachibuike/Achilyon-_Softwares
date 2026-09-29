import type { MarketToken } from '@/types'

/**
 * Transparent ranking functions. Every score is a weighted sum of named,
 * bounded components so the UI can explain exactly why a token ranks where
 * it does. Rankings describe the data Achilyon has — in demo mode that data
 * is simulated and is labelled accordingly.
 */

export interface ScoreComponent {
  label: string
  value: number
  max: number
}

export interface Score {
  score: number
  components: ScoreComponent[]
}

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0))

function build(components: ScoreComponent[]): Score {
  return { score: Math.round(components.reduce((s, c) => s + c.value, 0)), components }
}

/** Trending Now: hourly volume acceleration + buy pressure + activity + depth. Max 100. */
export function trendingScore(t: MarketToken): Score {
  const m = t.market
  const hourlyAvg = m.volume.h24 / 24
  const acceleration = hourlyAvg > 0 ? (m.volume.h1 / hourlyAvg) * 10 : 0
  const { buys, sells } = m.txns.h1
  const buyPressure = buys + sells > 0 ? (buys / (buys + sells)) * 25 : 0
  return build([
    { label: 'Volume acceleration (1h vs 24h avg)', value: clamp(acceleration, 35), max: 35 },
    { label: 'Buy pressure (1h)', value: clamp(buyPressure, 25), max: 25 },
    { label: 'Trade activity (1h)', value: clamp((buys + sells) / 20, 20), max: 20 },
    { label: 'Liquidity depth', value: clamp(Math.log10(Math.max(m.liquidityUsd, 1)) * 3, 20), max: 20 },
  ])
}

/** Fastest Growing: short-window price momentum weighted by liquidity. */
export function growthScore(t: MarketToken): Score {
  const m = t.market
  const depth = clamp(Math.log10(Math.max(m.liquidityUsd, 1)) / 6, 1)
  return build([
    { label: '1h change', value: clamp(m.priceChange.h1 * depth, 40), max: 40 },
    { label: '6h change', value: clamp((m.priceChange.h6 / 2) * depth, 35), max: 35 },
    { label: 'Liquidity factor', value: depth * 25, max: 25 },
  ])
}

/** Most Discussed: comment volume relative to age. */
export function discussionScore(t: MarketToken, now = Date.now()): Score {
  const ageHours = Math.max(1, (now - t.token.createdAt) / 3_600_000)
  return build([
    { label: 'Comments', value: clamp(t.social.comments / 4, 60), max: 60 },
    { label: 'Comments per hour', value: clamp((t.social.comments / ageHours) * 8, 40), max: 40 },
  ])
}

/** Newly Viral: tokens younger than 48h with strong activity. */
export function viralScore(t: MarketToken, now = Date.now()): Score {
  const ageHours = (now - t.token.createdAt) / 3_600_000
  if (ageHours > 48) return build([{ label: 'Age over 48h', value: 0, max: 100 }])
  const m = t.market
  return build([
    { label: 'Freshness', value: clamp((48 - ageHours) / 48 * 30, 30), max: 30 },
    { label: 'Trades (24h)', value: clamp((m.txns.h24.buys + m.txns.h24.sells) / 50, 30), max: 30 },
    { label: 'Watchers', value: clamp(t.social.watchers / 10, 20), max: 20 },
    { label: 'Comments', value: clamp(t.social.comments / 5, 20), max: 20 },
  ])
}

export function rankBy(tokens: MarketToken[], scorer: (t: MarketToken) => Score, limit = 10): { token: MarketToken; score: Score }[] {
  return tokens
    .map((token) => ({ token, score: scorer(token) }))
    .filter((r) => r.score.score > 0)
    .sort((a, b) => b.score.score - a.score.score)
    .slice(0, limit)
}
