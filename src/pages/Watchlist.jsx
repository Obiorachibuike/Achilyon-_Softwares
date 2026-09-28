import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Star, Trash2 } from 'lucide-react'
import useWatchlistStore from '../store/useWatchlistStore'
import useLivePairs from '../hooks/useLivePairs'
import { formatUsdCompact, timeAgo } from '../lib/utils'
import MarketTable from '../components/MarketTable'
import { Button, Card, EmptyState, PageHeader, Spinner, TokenAvatar } from '../components/ui'
import { chainLabel } from '../config'

export default function Watchlist() {
  const items = useWatchlistStore((s) => s.items)
  const remove = useWatchlistStore((s) => s.remove)
  const clear = useWatchlistStore((s) => s.clear)
  const { pairs, loading, lastUpdated, refresh, error } = useLivePairs(items)

  const live = useMemo(() => items.map((i) => pairs.get(`${i.chainId}:${i.pairAddress}`.toLowerCase())).filter(Boolean), [items, pairs])
  const missing = items.filter((i) => !pairs.has(`${i.chainId}:${i.pairAddress}`.toLowerCase()))
  const totals = useMemo(() => ({
    volume: live.reduce((s, p) => s + (p.volume?.h24 ?? 0), 0),
    up: live.filter((p) => (p.priceChange?.h24 ?? 0) > 0).length,
  }), [live])

  return (
    <div className="space-y-5">
      <PageHeader
        title="Watchlist"
        description="Pairs you're tracking. Saved in this browser and refreshed with live prices."
        actions={items.length > 0 && (
          <>
            <Button onClick={refresh} loading={loading}>{!loading && <RefreshCw size={15} />} Refresh</Button>
            <Button variant="danger" onClick={() => { if (confirm('Remove all pairs from your watchlist?')) clear() }}>Clear all</Button>
          </>
        )}
      />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Star}
            title="Nothing on your watchlist yet"
            description="Star any pair in Markets or on a token page to keep an eye on it here."
            action={<Link to="/markets"><Button variant="primary">Browse markets</Button></Link>}
          />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span><b className="text-foreground">{items.length}</b> pairs</span>
            <span><b className="text-up">{totals.up}</b> up · <b className="text-down">{live.length - totals.up}</b> down (24h)</span>
            <span><b className="text-foreground">{formatUsdCompact(totals.volume)}</b> combined 24h volume</span>
            {lastUpdated && <span>Updated {timeAgo(lastUpdated)}</span>}
          </div>
          <Card className="overflow-hidden">
            {loading && !live.length ? <Spinner label="Fetching live prices…" /> : live.length ? <MarketTable data={live} /> : (
              <EmptyState title="Live prices unavailable" description={error || 'DexScreener did not return data for these pairs. Try refreshing.'} />
            )}
          </Card>
          {!loading && missing.length > 0 && live.length > 0 && (
            <Card>
              <p className="border-b border-border px-5 py-3 text-xs text-muted-foreground">No live data returned for these saved pairs:</p>
              <ul className="divide-y divide-border/60">
                {missing.map((i) => (
                  <li key={`${i.chainId}-${i.pairAddress}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <Link to={`/token/${i.chainId}/${i.pairAddress}`} className="flex items-center gap-2 hover:text-primary">
                      <TokenAvatar src={i.icon} symbol={i.symbol} size={24} /> <b>{i.symbol}</b>/{i.quote} <span className="text-xs text-muted-foreground">{chainLabel(i.chainId)}</span>
                    </Link>
                    <button type="button" onClick={() => remove(i.chainId, i.pairAddress)} className="p-1 text-muted-foreground hover:text-red-400" aria-label="Remove"><Trash2 size={15} /></button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
