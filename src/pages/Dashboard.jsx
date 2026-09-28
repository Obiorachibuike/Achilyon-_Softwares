import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, BarChart3, Bell, Droplets, Flame, Sparkles, Star, TrendingDown, TrendingUp } from 'lucide-react'
import useMarketStore from '../store/useMarketStore'
import useWatchlistStore from '../store/useWatchlistStore'
import useAlertStore, { ALERT_TYPES } from '../store/useAlertStore'
import { marketStats, metrics, topMovers } from '../lib/market'
import { formatAge, formatPrice, formatUsdCompact, timeAgo } from '../lib/utils'
import { Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, PriceChange, Spinner, StatCard, TokenAvatar, TokenCell } from '../components/ui'
import MarketTable from '../components/MarketTable'

function MoverList({ pairs, empty }) {
  if (!pairs.length) return <p className="px-5 py-8 text-center text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="divide-y divide-border/60">
      {pairs.map((p) => (
        <li key={`${p.chainId}-${p.pairAddress}`}>
          <Link to={`/token/${p.chainId}/${p.pairAddress}`} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5">
            <TokenCell pair={p} to={false} />
            <div className="text-right">
              <div className="text-sm tabular-nums">{formatPrice(p.priceUsd)}</div>
              <PriceChange value={p.priceChange?.h24} className="text-xs" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Dashboard() {
  const { pairs, status, error, fetchMarket, lastUpdated } = useMarketStore()
  const watchlist = useWatchlistStore((s) => s.items)
  const alerts = useAlertStore((s) => s.alerts)

  const stats = useMemo(() => marketStats(pairs), [pairs])
  const gainers = useMemo(() => topMovers(pairs, { direction: 'up' }), [pairs])
  const losers = useMemo(() => topMovers(pairs, { direction: 'down' }), [pairs])
  const trending = useMemo(
    () => [...pairs].filter((p) => (p.liquidity?.usd ?? 0) > 20_000).sort((a, b) => metrics(b).score - metrics(a).score).slice(0, 12),
    [pairs],
  )
  const fresh = useMemo(
    () => pairs.filter((p) => p.pairCreatedAt && Date.now() - p.pairCreatedAt < 3 * 86_400_000 && (p.liquidity?.usd ?? 0) > 5_000)
      .sort((a, b) => b.pairCreatedAt - a.pairCreatedAt).slice(0, 5),
    [pairs],
  )
  const watchPairs = useMemo(() => {
    const byKey = new Map(pairs.map((p) => [`${p.chainId}:${p.pairAddress}`.toLowerCase(), p]))
    return watchlist.slice(0, 5).map((w) => byKey.get(`${w.chainId}:${w.pairAddress}`.toLowerCase()) ?? null).filter(Boolean)
  }, [pairs, watchlist])
  const recentAlerts = alerts.slice(0, 4)

  if (status === 'loading' && !pairs.length) return <Spinner label="Loading live market data from DexScreener…" />
  if (status === 'error' && !pairs.length) return <ErrorState message={error} onRetry={() => fetchMarket()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market overview"
        description={`Live snapshot of ${stats.count.toLocaleString()} DEX pairs across major chains${lastUpdated ? ` · updated ${timeAgo(lastUpdated)}` : ''}.`}
        actions={<Link to="/markets"><Button variant="primary">Explore markets <ArrowRight size={15} /></Button></Link>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="24h volume" value={formatUsdCompact(stats.volume)} sub={`${stats.count} tracked pairs`} icon={BarChart3} />
        <StatCard label="Total liquidity" value={formatUsdCompact(stats.liquidity)} sub="Across tracked pools" icon={Droplets} tone="good" />
        <StatCard label="New pairs (24h)" value={stats.fresh.toLocaleString()} sub="Created in the last day" icon={Sparkles} tone="warn" />
        <StatCard
          label="Market breadth"
          value={`${stats.breadth}%`}
          sub={`${stats.buys.toLocaleString()} buys · ${stats.sells.toLocaleString()} sells`}
          icon={Activity}
          tone={stats.breadth >= 50 ? 'good' : 'bad'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="Top gainers" subtitle="24h · liquidity > $10K" icon={TrendingUp} />
          <MoverList pairs={gainers} empty="No gainers yet." />
        </Card>
        <Card>
          <CardHeader title="Top losers" subtitle="24h · liquidity > $10K" icon={TrendingDown} />
          <MoverList pairs={losers} empty="No losers yet." />
        </Card>
        <Card>
          <CardHeader title="Fresh launches" subtitle="Pairs created in the last 72h" icon={Sparkles} action={<Link to="/markets?age=7d&sort=age" className="text-xs text-primary hover:underline">View all</Link>} />
          {fresh.length ? (
            <ul className="divide-y divide-border/60">
              {fresh.map((p) => (
                <li key={`${p.chainId}-${p.pairAddress}`}>
                  <Link to={`/token/${p.chainId}/${p.pairAddress}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 sm:px-5">
                    <TokenCell pair={p} to={false} />
                    <div className="text-right text-xs">
                      <div className="font-semibold text-amber-400">{formatAge(p.pairCreatedAt)} old</div>
                      <div className="text-muted-foreground">{formatUsdCompact(p.liquidity?.usd)} liq</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="px-5 py-8 text-center text-sm text-muted-foreground">No fresh pairs in the current universe.</p>}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Trending now"
          subtitle="Ranked by momentum score: hourly volume spike, buy pressure and liquidity"
          icon={Flame}
          action={<Link to="/markets?sort=score" className="text-xs text-primary hover:underline">Full table</Link>}
        />
        <MarketTable data={trending} compact sorting={[{ id: 'score', desc: true }]} onSortingChange={() => {}} pageSize={12} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Watchlist" icon={Star} action={<Link to="/watchlist" className="text-xs text-primary hover:underline">Manage</Link>} />
          {watchlist.length === 0 ? (
            <EmptyState icon={Star} title="Your watchlist is empty" description="Tap the star next to any pair to track it here." />
          ) : watchPairs.length ? (
            <MoverList pairs={watchPairs} empty="" />
          ) : (
            <ul className="divide-y divide-border/60">
              {watchlist.slice(0, 5).map((w) => (
                <li key={`${w.chainId}-${w.pairAddress}`}>
                  <Link to={`/token/${w.chainId}/${w.pairAddress}`} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                    <TokenAvatar src={w.icon} symbol={w.symbol} size={28} />
                    <span className="font-semibold">{w.symbol}</span>
                    <span className="text-xs text-muted-foreground">/{w.quote}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Recent alerts" icon={Bell} action={<Link to="/alerts" className="text-xs text-primary hover:underline">All alerts</Link>} />
          {recentAlerts.length === 0 ? (
            <EmptyState icon={Bell} title="No alerts yet" description="Open any token and create a price or momentum alert." />
          ) : (
            <ul className="divide-y divide-border/60">
              {recentAlerts.map((a) => (
                <li key={a.id}>
                  <Link to={`/token/${a.chainId}/${a.pairAddress}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.symbol}/{a.quote}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ALERT_TYPES[a.type]?.label} {ALERT_TYPES[a.type]?.unit === '%' ? `${a.value}%` : formatPrice(a.value)}
                      </p>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${a.status === 'triggered' ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {a.status === 'triggered' ? `Triggered ${timeAgo(a.triggeredAt)}` : 'Active'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
