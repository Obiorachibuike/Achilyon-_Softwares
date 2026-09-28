import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BellRing, CandlestickChart, ExternalLink, Globe, Layers, ShieldCheck, Trash2 } from 'lucide-react'
import { dexService } from '../services/api'
import useMarketStore from '../store/useMarketStore'
import useAlertStore, { ALERT_TYPES } from '../store/useAlertStore'
import useVisibleInterval from '../hooks/useVisibleInterval'
import { config, chainLabel } from '../config'
import { metrics } from '../lib/market'
import { formatAge, formatPrice, formatUsdCompact, shortAddress, timeAgo } from '../lib/utils'
import AISummary from '../components/AISummary'
import AlertForm from '../components/AlertForm'
import ChartEmbed from '../components/ChartEmbed'
import { Badge, Button, Card, CardHeader, ChainBadge, CopyButton, EmptyState, ErrorState, PriceChange, Spinner, TokenAvatar, WatchButton } from '../components/ui'

function Metric({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-border bg-background/30 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
      {sub && <div className="mt-0.5 text-xs">{sub}</div>}
    </div>
  )
}

function TxnBar({ label, buys = 0, sells = 0 }) {
  const total = buys + sells
  const pct = total ? (buys / total) * 100 : 50
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums"><span className="text-up">{buys.toLocaleString()}</span> / <span className="text-down">{sells.toLocaleString()}</span></span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-down/50"><div className="bg-up" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export default function TokenDetail() {
  const { chainId, pairAddress } = useParams()
  const cached = useMarketStore((s) => s.pairs.find((p) => p.chainId === chainId && p.pairAddress.toLowerCase() === pairAddress.toLowerCase()))
  const upsertPairs = useMarketStore((s) => s.upsertPairs)
  const [pair, setPair] = useState(cached ?? null)
  const [status, setStatus] = useState(cached ? 'ready' : 'loading')
  const [error, setError] = useState(null)
  const [updated, setUpdated] = useState(null)
  const [otherPairs, setOtherPairs] = useState([])
  const allAlerts = useAlertStore((s) => s.alerts)
  const removeAlert = useAlertStore((s) => s.remove)
  const alerts = useMemo(
    () => allAlerts.filter((a) => a.chainId === chainId && a.pairAddress.toLowerCase() === pairAddress.toLowerCase()),
    [allAlerts, chainId, pairAddress],
  )

  const load = useCallback(async () => {
    try {
      const fresh = await dexService.getPair(chainId, pairAddress)
      if (!fresh) { setStatus('notfound'); return }
      setPair(fresh)
      upsertPairs([fresh])
      setStatus('ready')
      setError(null)
      setUpdated(Date.now())
    } catch (err) {
      setError(err?.message || 'Failed to load pair')
      setStatus((s) => (s === 'ready' ? s : 'error'))
    }
  }, [chainId, pairAddress, upsertPairs])

  useEffect(() => { setPair(cached ?? null); setStatus(cached ? 'ready' : 'loading'); load() }, [chainId, pairAddress]) // eslint-disable-line react-hooks/exhaustive-deps
  useVisibleInterval(load, Math.min(config.refreshIntervalMs, 30000))

  const baseAddress = pair?.baseToken?.address
  useEffect(() => {
    if (!baseAddress) return undefined
    let cancelled = false
    dexService.getTokenPairs(baseAddress)
      .then((list) => { if (!cancelled) setOtherPairs(list.filter((p) => p.pairAddress !== pair.pairAddress).sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)).slice(0, 8)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [baseAddress]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pair) document.title = `${pair.baseToken.symbol} ${formatPrice(pair.priceUsd)} · Achilyon`
  }, [pair])

  if (status === 'loading') return <Spinner label="Loading pair…" />
  if (status === 'notfound') {
    return <EmptyState title="Pair not found" description={`No ${chainLabel(chainId)} pair exists at ${shortAddress(pairAddress, 6)}.`} action={<Link to="/markets"><Button>Back to markets</Button></Link>} />
  }
  if (status === 'error' || !pair) return <ErrorState message={error} onRetry={load} />

  const m = metrics(pair)
  const links = [...(pair.info?.websites ?? []).map((w) => ({ label: w.label || 'Website', url: w.url })), ...(pair.info?.socials ?? []).map((s) => ({ label: s.type, url: s.url }))]

  return (
    <div className="space-y-5">
      <Link to="/markets" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={15} /> Markets</Link>

      <Card className="overflow-hidden">
        {pair.info?.header && <img src={pair.info.header} alt="" className="h-24 w-full object-cover opacity-70 sm:h-32" />}
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <TokenAvatar pair={pair} size={52} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="brand text-2xl font-bold">{pair.baseToken.symbol}</h1>
                <span className="text-muted-foreground">/ {pair.quoteToken?.symbol}</span>
                <ChainBadge chainId={pair.chainId} />
                <Badge className="capitalize">{pair.dexId}</Badge>
                {pair.labels?.map((l) => <Badge key={l} tone="primary">{l}</Badge>)}
              </div>
              <p className="truncate text-sm text-muted-foreground">{pair.baseToken.name}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <p className="brand text-3xl font-bold tabular-nums">{formatPrice(pair.priceUsd)}</p>
              <div className="flex items-center gap-2 text-sm">
                <PriceChange value={m.change24h} /> <span className="text-xs text-muted-foreground">24h · updated {timeAgo(updated)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <WatchButton pair={pair} withLabel />
              <Link to={`/trade/${pair.chainId}/${pair.pairAddress}`}><Button variant="primary"><CandlestickChart size={15} /> Trade</Button></Link>
              <Link to={`/analyzer?chain=${pair.chainId}&address=${pair.baseToken.address}`}><Button><ShieldCheck size={15} /> Analyze</Button></Link>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <ChartEmbed chainId={pair.chainId} pairAddress={pair.pairAddress} />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Metric label="Market cap" value={formatUsdCompact(m.marketCap)} />
            <Metric label="FDV" value={formatUsdCompact(m.fdv)} />
            <Metric label="Liquidity" value={formatUsdCompact(m.liquidity)} sub={<span className="text-muted-foreground">{m.fdv && m.liquidity ? `${(m.fdv / m.liquidity).toFixed(1)}× FDV/liq` : ''}</span>} />
            <Metric label="Volume 24h" value={formatUsdCompact(m.volume24h)} />
            <Metric label="5m" value={<PriceChange value={m.change5m} />} />
            <Metric label="1h" value={<PriceChange value={m.change1h} />} />
            <Metric label="6h" value={<PriceChange value={m.change6h} />} />
            <Metric label="Pair age" value={formatAge(pair.pairCreatedAt)} sub={<span className="text-muted-foreground">{pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toLocaleDateString() : ''}</span>} />
          </div>

          <AISummary token={pair} />

          {otherPairs.length > 0 && (
            <Card>
              <CardHeader title="Other pools for this token" icon={Layers} />
              <ul className="divide-y divide-border/60">
                {otherPairs.map((p) => (
                  <li key={p.pairAddress}>
                    <Link to={`/token/${p.chainId}/${p.pairAddress}`} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-muted/40">
                      <span className="flex items-center gap-2"><b>{p.baseToken.symbol}/{p.quoteToken?.symbol}</b><Badge className="capitalize">{p.dexId}</Badge><ChainBadge chainId={p.chainId} /></span>
                      <span className="text-right tabular-nums text-muted-foreground">{formatUsdCompact(p.liquidity?.usd)} liq · {formatUsdCompact(p.volume?.h24)} vol</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader title="Transactions" subtitle="Buys / sells" />
            <div className="space-y-3 p-4 sm:p-5">
              {[['m5', '5m'], ['h1', '1h'], ['h6', '6h'], ['h24', '24h']].map(([k, label]) => <TxnBar key={k} label={label} buys={pair.txns?.[k]?.buys} sells={pair.txns?.[k]?.sells} />)}
            </div>
          </Card>

          <Card>
            <CardHeader title="Price alerts" icon={BellRing} subtitle={alerts.length ? `${alerts.length} for this pair` : 'Checked every refresh'} />
            <div className="space-y-4 p-4 sm:p-5">
              <AlertForm pair={pair} />
              {alerts.length > 0 && (
                <ul className="space-y-2 border-t border-border pt-4">
                  {alerts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{ALERT_TYPES[a.type]?.label} <b>{ALERT_TYPES[a.type]?.unit === '%' ? `${a.value}%` : formatPrice(a.value)}</b></span>
                      <span className="flex items-center gap-1">
                        <Badge tone={a.status === 'triggered' ? 'warn' : 'good'}>{a.status}</Badge>
                        <button type="button" onClick={() => removeAlert(a.id)} className="p-1 text-muted-foreground hover:text-red-400" aria-label="Delete alert"><Trash2 size={14} /></button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Contract info" />
            <dl className="space-y-2.5 p-4 text-sm sm:p-5">
              {[
                ['Pair', pair.pairAddress],
                [pair.baseToken.symbol, pair.baseToken.address],
                [pair.quoteToken?.symbol, pair.quoteToken?.address],
              ].map(([label, addr]) => (
                <div key={label + addr} className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="flex items-center gap-1 font-mono text-xs">{shortAddress(addr, 5)}<CopyButton value={addr} /></dd>
                </div>
              ))}
            </dl>
            {(links.length > 0 || pair.url) && (
              <div className="flex flex-wrap gap-2 border-t border-border p-4 sm:px-5">
                {links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs capitalize text-muted-foreground hover:text-foreground">
                    <Globe size={12} /> {l.label}
                  </a>
                ))}
                {pair.url && (
                  <a href={pair.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
                    DexScreener <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}
