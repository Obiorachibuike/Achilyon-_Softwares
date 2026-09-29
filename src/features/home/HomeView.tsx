'use client'
import Link from 'next/link'
import { ArrowRight, Flame, Sparkles, TrendingDown, TrendingUp, Layers, History, Rocket, ShieldCheck, Activity, LineChart, Radar } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTokenList } from '@/hooks/useMarket'
import { useNow } from '@/hooks/useNow'
import { useMounted } from '@/hooks/useMounted'
import { useMemo } from 'react'
import { useRecentStore } from '@/stores/recent'
import { usePreferences } from '@/stores/preferences'
import { errorMessage } from '@/lib/api/client'
import { tokenPath } from '@/lib/paths'
import { ButtonLink } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/primitives'
import { DemoBadge, ErrorState } from '@/components/ui/feedback'
import { TokenLogo } from '@/components/token/TokenLogo'
import { MarketStrip } from '@/features/market/MarketStrip'
import { TokenCard, TokenCardSkeleton } from '@/features/market/TokenCard'
import { TokenTable } from '@/features/market/TokenTable'
import { MiniTokenList } from '@/features/market/MiniTokenList'
import { formatInteger, formatUsdCompact } from '@/lib/format'

function SectionLink({ href, children = 'View all' }: { href: string; children?: ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-fg">{children} <ArrowRight className="h-3 w-3" aria-hidden /></Link>
}

function MarketStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="absolute right-0 top-0 h-16 w-16 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <div className="label">{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight num">{value}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </Card>
  )
}

export function HomeView() {
  const mounted = useMounted()
  const network = usePreferences((s) => s.network)
  const chain = mounted && network !== 'all' ? `chain=${network}&` : ''
  const trending = useTokenList('trending', `${chain}pageSize=10`)
  const fresh = useTokenList('new', `${chain}pageSize=8`)
  const pairs = useTokenList('pairs', `${chain}pageSize=8`)
  const gainers = useTokenList('gainers', `${chain}pageSize=5`)
  const losers = useTokenList('losers', `${chain}pageSize=5`)
  const recent = useRecentStore((s) => s.items)
  const now = useNow(30_000)
  const demo = trending.data?.demo
  const snapshot = useMemo(() => {
    const items = trending.data?.items ?? []
    let volume = 0
    let liquidity = 0
    let buys = 0
    let sells = 0
    for (const item of items) {
      volume += item.market.volume.h24
      liquidity += item.market.liquidityUsd
      buys += item.market.txns.h24.buys
      sells += item.market.txns.h24.sells
    }
    const totalTxns = buys + sells
    return {
      volume,
      liquidity,
      buyPressure: totalTxns > 0 ? (buys / totalTxns) * 100 : null,
    }
  }, [trending.data?.items])

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-card px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_0%,rgba(59,130,246,0.18),transparent_60%),radial-gradient(40%_60%_at_100%_100%,rgba(245,176,65,0.08),transparent_60%)]" aria-hidden />
        <div className="relative max-w-2xl">
          <div className="mb-4 flex items-center gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-2 px-2.5 py-1"><span className="h-1.5 w-1.5 rounded-full bg-up" aria-hidden /> Markets across 6 networks</span>
            {demo && <DemoBadge />}
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Discover the next market <span className="text-gradient">before everyone else.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
            Real-time discovery, fair bonding-curve launches and transparent trading analytics — with risk signals on every token.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <ButtonLink href="/discover" variant="primary" size="lg">Explore Markets <ArrowRight className="h-4 w-4" aria-hidden /></ButtonLink>
            <ButtonLink href="/launch" size="lg"><Rocket className="h-4 w-4" aria-hidden /> Launch a Token</ButtonLink>
          </div>
        </div>
      </section>

      <MarketStrip />

      <section aria-label="Market snapshot" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MarketStat
          label="Tracked markets"
          value={formatInteger(trending.data?.total ?? 0)}
          detail={demo ? 'Simulated universe' : 'Live tracked universe'}
        />
        <MarketStat
          label="24h volume"
          value={formatUsdCompact(snapshot.volume)}
          detail="Across tracked markets"
        />
        <MarketStat
          label="Liquidity"
          value={formatUsdCompact(snapshot.liquidity)}
          detail="Across tracked markets"
        />
        <MarketStat
          label="Buy pressure"
          value={snapshot.buyPressure === null ? 'N/A' : `${snapshot.buyPressure.toFixed(0)}%`}
          detail="24h buys / total transactions"
        />
      </section>

      <section aria-labelledby="trending-h">
        <Card className="overflow-hidden">
          <CardHeader title={<span id="trending-h">Trending now</span>} icon={<Flame className="h-4 w-4 text-gold" />} subtitle="Ranked by a transparent volume, momentum and activity score" action={<SectionLink href="/trending" />} />
          <TokenTable caption="Trending tokens" tokens={trending.data?.items} loading={trending.isLoading} error={trending.error ? errorMessage(trending.error) : null} onRetry={() => void trending.refetch()} columns={['token', 'price', 'change1h', 'change24h', 'volume', 'liquidity', 'marketCap', 'buyRatio']} pageSize={10} />
        </Card>
      </section>

      <section aria-labelledby="new-h">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="new-h" className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="h-4 w-4 text-primary" aria-hidden /> New tokens</h2>
          <SectionLink href="/new" />
        </div>
        {fresh.error && !fresh.data ? (
          <ErrorState message={errorMessage(fresh.error)} onRetry={() => void fresh.refetch()} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {fresh.data ? fresh.data.items.slice(0, 8).map((t) => <TokenCard key={t.token.address} token={t} now={now} variant="launch" />) : Array.from({ length: 4 }, (_, i) => <TokenCardSkeleton key={i} />)}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top gainers" icon={<TrendingUp className="h-4 w-4 text-up" />} subtitle="24h" action={<SectionLink href="/gainers" />} />
          <MiniTokenList tokens={gainers.data?.items} loading={gainers.isLoading} empty="No gainers right now" />
        </Card>
        <Card>
          <CardHeader title="Top losers" icon={<TrendingDown className="h-4 w-4 text-down" />} subtitle="24h" action={<SectionLink href="/losers" />} />
          <MiniTokenList tokens={losers.data?.items} loading={losers.isLoading} empty="No losers right now" />
        </Card>
      </div>

      <section aria-labelledby="pairs-h">
        <Card className="overflow-hidden">
          <CardHeader title={<span id="pairs-h">New pairs</span>} icon={<Layers className="h-4 w-4 text-primary" />} subtitle="Latest pools across supported DEXs" action={<SectionLink href="/pairs" />} />
          <TokenTable caption="New pairs" tokens={pairs.data?.items} loading={pairs.isLoading} error={pairs.error ? errorMessage(pairs.error) : null} onRetry={() => void pairs.refetch()} columns={['token', 'dex', 'age', 'price', 'change24h', 'liquidity', 'volume']} pageSize={8} showRank={false} />
        </Card>
      </section>

      {mounted && recent.length > 0 && (
        <section aria-labelledby="recent-h">
          <h2 id="recent-h" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><History className="h-4 w-4 text-muted" aria-hidden /> Recently viewed</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {recent.map((r) => (
              <Link key={`${r.chain}:${r.address}`} href={tokenPath(r.chain, r.address)} className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm hover:border-line-strong">
                <TokenLogo src={r.logoUrl} symbol={r.symbol} size={22} />
                <span className="font-semibold">{r.symbol}</span>
                <span className="max-w-[120px] truncate text-xs text-muted">{r.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="why-h" className="pt-2">
        <h2 id="why-h" className="font-display text-2xl font-semibold tracking-tight">Why Achilyon</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">Built for people who want to see the whole picture before they trade.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w) => (
            <Card key={w.title} className="p-5">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-bg-2 text-primary">{w.icon}</div>
              <h3 className="mt-4 font-semibold">{w.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{w.body}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

const WHY = [
  { icon: <Radar className="h-4 w-4" />, title: 'Real-time discovery', body: 'Trending, new tokens, new pairs and movers across six networks, updated live with a transparent ranking formula.' },
  { icon: <LineChart className="h-4 w-4" />, title: 'Analytics that explain', body: 'Price, market cap, liquidity and volume charts from 1 minute to 1 month, plus buy/sell flow for every market.' },
  { icon: <Rocket className="h-4 w-4" />, title: 'Fair launches', body: 'Launch on a published bonding curve — no presale, creator allocation capped, automatic migration to a DEX.' },
  { icon: <ShieldCheck className="h-4 w-4" />, title: 'Risk up front', body: 'Liquidity, age, volatility and contract checks surface on every token page — heuristics, clearly labelled.' },
  { icon: <Activity className="h-4 w-4" />, title: 'Honest by default', body: 'Demo data is always labelled. Transactions only show as confirmed once they settle. No fake numbers.' },
  { icon: <Layers className="h-4 w-4" />, title: 'Your keys, your wallet', body: 'Connect with your own wallet. Achilyon never asks for private keys or seed phrases — ever.' },
]
