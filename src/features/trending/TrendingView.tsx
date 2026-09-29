'use client'
import Link from 'next/link'
import { useMemo } from 'react'
import { Flame, Rocket, MessageCircle, Zap, Info } from 'lucide-react'
import type { MarketToken } from '@/types'
import { useTokenList } from '@/hooks/useMarket'
import { useNow } from '@/hooks/useNow'
import { useMounted } from '@/hooks/useMounted'
import { usePreferences } from '@/stores/preferences'
import { discussionScore, growthScore, rankBy, trendingScore, viralScore, type Score } from '@/lib/market/scoring'
import { errorMessage } from '@/lib/api/client'
import { formatPrice, formatUsdCompact } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { Card, CardHeader, PageHeader, Skeleton } from '@/components/ui/primitives'
import { DemoBadge, ErrorState, Notice } from '@/components/ui/feedback'
import { TokenLogo } from '@/components/token/TokenLogo'
import { PriceChange } from '@/components/token/PriceChange'
import { Tooltip } from '@/components/ui/Tooltip'

type Ranked = { token: MarketToken; score: Score }

/**
 * Trending hub. Scores are computed client-side from the market list with the
 * published formulas in lib/market/scoring.ts — every rank can be explained.
 */
export function TrendingView() {
  const mounted = useMounted()
  const network = usePreferences((s) => s.network)
  const params = `${mounted && network !== 'all' ? `chain=${network}&` : ''}pageSize=200`
  const { data, isLoading, error, refetch } = useTokenList('all', params)
  const now = useNow(60_000)

  const sections = useMemo(() => {
    const tokens = data?.items ?? []
    return [
      { id: 'now', title: 'Trending now', icon: <Flame className="h-4 w-4 text-gold" />, rows: rankBy(tokens, trendingScore, 10), formula: 'Volume acceleration (35) + buy pressure (25) + 1h trade activity (20) + liquidity depth (20).' },
      { id: 'growth', title: 'Fastest growing', icon: <Rocket className="h-4 w-4 text-up" />, rows: rankBy(tokens, growthScore, 10), formula: '1h change (40) + 6h change (35) + liquidity factor (25), damped for shallow pools.' },
      { id: 'discussed', title: 'Most discussed', icon: <MessageCircle className="h-4 w-4 text-primary" />, rows: rankBy(tokens, (t) => discussionScore(t, now), 10), formula: 'Total comments (60) + comments per hour since launch (40).' },
      { id: 'viral', title: 'Newly viral', icon: <Zap className="h-4 w-4 text-gold" />, rows: rankBy(tokens, (t) => viralScore(t, now), 10), formula: 'Only tokens under 48h old: freshness (30) + trades (30) + watchers (20) + comments (20).' },
    ]
  }, [data, now])

  return (
    <div className="space-y-5">
      <PageHeader title="Trending" description="Four transparent rankings. Hover a score to see exactly how it was calculated." eyebrow={data?.demo ? <DemoBadge /> : undefined} />
      <Notice tone="info" icon={<Info className="h-4 w-4" />}>
        Rankings reflect the market data Achilyon currently tracks{data?.demo ? ' — simulated in demo mode' : ''}. They are not endorsements or predictions.
      </Notice>
      {error && !data ? (
        <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {sections.map((s) => (
            <Card key={s.id} id={s.id} className="overflow-hidden">
              <CardHeader title={s.title} icon={s.icon} subtitle={s.formula} />
              {isLoading && !data ? (
                <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : s.rows.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">No tokens qualify right now.</p>
              ) : (
                <ol className="p-2">{s.rows.map((r, i) => <RankedRow key={`${r.token.token.chain}:${r.token.token.address}`} r={r} rank={i + 1} />)}</ol>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function RankedRow({ r, rank }: { r: Ranked; rank: number }) {
  const t = r.token
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
      <span className="num w-5 text-xs text-subtle">{rank}</span>
      <Link href={tokenPath(t.token.chain, t.token.address)} className="flex min-w-0 flex-1 items-center gap-3">
        <TokenLogo src={t.token.logoUrl} symbol={t.token.symbol} size={30} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{t.token.symbol} <span className="font-normal text-muted">{t.token.name}</span></div>
          <div className="num text-[11px] text-muted">{formatPrice(t.market.priceUsd)} · Vol {formatUsdCompact(t.market.volume.h24)}</div>
        </div>
      </Link>
      <PriceChange value={t.market.priceChange.h24} className="text-xs" />
      <Tooltip
        side="top"
        content={
          <div className="w-64 space-y-1.5">
            {r.score.components.map((c) => (
              <div key={c.label}>
                <div className="flex justify-between gap-2 text-[11px]"><span className="text-muted">{c.label}</span><span className="num">{c.value.toFixed(1)} / {c.max}</span></div>
                <div className="mt-0.5 h-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.value / c.max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        }
      >
        <button type="button" className="num w-12 rounded-lg border border-line py-1 text-center text-xs font-semibold hover:border-primary/50" aria-label={`Score ${r.score.score}: ${r.score.components.map((c) => `${c.label} ${c.value.toFixed(1)} of ${c.max}`).join(', ')}`}>
          {r.score.score}
        </button>
      </Tooltip>
    </li>
  )
}
