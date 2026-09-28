import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CandlestickChart, History, RotateCcw, Search, Wallet } from 'lucide-react'
import useTradeStore from '../store/useTradeStore'
import useMarketStore from '../store/useMarketStore'
import useLivePairs from '../hooks/useLivePairs'
import useDebounce from '../hooks/useDebounce'
import { dexService } from '../services/api'
import { dedupePairs, matchesQuery } from '../lib/market'
import { chainLabel } from '../config'
import { cn, formatCompactNumber, formatPrice, formatUsd, timeAgo } from '../lib/utils'
import { toast } from '../store/useToastStore'
import ChartEmbed from '../components/ChartEmbed'
import { Badge, Button, Card, CardHeader, EmptyState, Field, PageHeader, PriceChange, TokenAvatar, inputClass } from '../components/ui'

function PairPicker({ onPick }) {
  const pairs = useMarketStore((s) => s.pairs)
  const [q, setQ] = useState('')
  const [remote, setRemote] = useState([])
  const debounced = useDebounce(q.trim(), 350)
  useEffect(() => {
    if (debounced.length < 2) { setRemote([]); return undefined }
    let cancelled = false
    dexService.search(debounced).then((r) => { if (!cancelled) setRemote(r) }).catch(() => {})
    return () => { cancelled = true }
  }, [debounced])
  const results = useMemo(() => {
    const base = q.trim() ? dedupePairs(pairs.filter((p) => matchesQuery(p, q)), remote) : pairs
    return [...base].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0)).slice(0, 8)
  }, [pairs, remote, q])
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input className={cn(inputClass, 'pl-9')} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a pair to trade…" />
      </div>
      <ul className="max-h-72 overflow-y-auto rounded-lg border border-border">
        {results.map((p) => (
          <li key={`${p.chainId}-${p.pairAddress}`}>
            <button type="button" onClick={() => onPick(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50">
              <TokenAvatar pair={p} size={24} />
              <span className="flex-1"><b>{p.baseToken.symbol}</b>/{p.quoteToken?.symbol} <span className="text-xs text-muted-foreground">{chainLabel(p.chainId)}</span></span>
              <span className="tabular-nums">{formatPrice(p.priceUsd)}</span>
            </button>
          </li>
        ))}
        {!results.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No pairs found.</li>}
      </ul>
    </div>
  )
}

function OrderTicket({ pair, position }) {
  const { cash, slippageBps, feeBps, setSlippage, quote, buy, sell } = useTradeStore()
  const [side, setSide] = useState('buy')
  const [amount, setAmount] = useState('')
  const n = parseFloat(amount) || 0
  const q = side === 'buy' ? quote('buy', pair, { usd: n }) : quote('sell', pair, { qty: n })
  const max = side === 'buy' ? cash : position?.qty ?? 0

  const submit = (e) => {
    e.preventDefault()
    try {
      const r = side === 'buy' ? buy(pair, n) : sell(pair, n)
      toast({ title: `${side === 'buy' ? 'Bought' : 'Sold'} ${formatCompactNumber(r.qty)} ${pair.baseToken.symbol}`, description: `Filled at ${formatPrice(r.fill)} · fee ${formatUsd(r.fee)}`, tone: 'success' })
      setAmount('')
    } catch (err) {
      toast({ title: 'Order rejected', description: err.message, tone: 'error' })
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {['buy', 'sell'].map((s) => (
          <button key={s} type="button" onClick={() => { setSide(s); setAmount('') }} className={cn('rounded-md py-2 text-sm font-semibold capitalize transition-colors', side === s ? (s === 'buy' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white') : 'text-muted-foreground')}>{s}</button>
        ))}
      </div>
      <Field label={side === 'buy' ? 'Amount (USD)' : `Amount (${pair.baseToken.symbol})`} hint={`Available: ${side === 'buy' ? formatUsd(cash) : `${formatCompactNumber(max)} ${pair.baseToken.symbol}`}`}>
        <input className={inputClass} type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
      </Field>
      <div className="grid grid-cols-4 gap-1.5">
        {[25, 50, 75, 100].map((p) => (
          <button key={p} type="button" onClick={() => setAmount(p === 100 ? String(max) : String(side === 'buy' ? Math.floor(max * p) / 100 : +(max * p / 100).toPrecision(8)))} className="rounded-md border border-border py-1 text-xs text-muted-foreground hover:text-foreground">{p}%</button>
        ))}
      </div>
      <Field label="Slippage tolerance">
        <div className="flex gap-1.5">
          {[10, 50, 100, 300].map((b) => (
            <button key={b} type="button" onClick={() => setSlippage(b)} className={cn('flex-1 rounded-md border py-1 text-xs', slippageBps === b ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>{b / 100}%</button>
          ))}
        </div>
      </Field>
      <dl className="space-y-1.5 rounded-lg bg-background/40 p-3 text-xs">
        <div className="flex justify-between"><dt className="text-muted-foreground">Mid price</dt><dd className="tabular-nums">{formatPrice(pair.priceUsd)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Est. fill (worst case)</dt><dd className="tabular-nums">{q ? formatPrice(q.fill) : '—'}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Fee ({feeBps / 100}%)</dt><dd className="tabular-nums">{q && n ? formatUsd(q.fee) : '—'}</dd></div>
        <div className="flex justify-between font-medium"><dt>{side === 'buy' ? 'You receive' : 'You receive (USD)'}</dt><dd className="tabular-nums">{q && n ? (side === 'buy' ? `${formatCompactNumber(q.qty)} ${pair.baseToken.symbol}` : formatUsd(q.proceeds)) : '—'}</dd></div>
      </dl>
      <Button type="submit" size="lg" variant={side === 'buy' ? 'success' : 'danger'} className="w-full" disabled={!n || n > max + 1e-9}>
        {side === 'buy' ? 'Buy' : 'Sell'} {pair.baseToken.symbol}
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">Paper trading — simulated fills against live prices. No wallet or real funds involved.</p>
    </form>
  )
}

export default function Trade() {
  const { chainId, pairAddress } = useParams()
  const navigate = useNavigate()
  const { cash, positions, orders, startingBalance, reset } = useTradeStore()
  const positionList = Object.values(positions)
  const refs = useMemo(() => {
    const list = positionList.map(({ chainId: c, pairAddress: p }) => ({ chainId: c, pairAddress: p }))
    if (chainId && pairAddress) list.push({ chainId, pairAddress })
    return list
  }, [positions, chainId, pairAddress]) // eslint-disable-line react-hooks/exhaustive-deps
  const { pairs } = useLivePairs(refs)
  const cachedSelected = useMarketStore((s) => (chainId ? s.pairs.find((p) => p.chainId === chainId && p.pairAddress.toLowerCase() === pairAddress?.toLowerCase()) : null))
  const selected = (chainId && pairs.get(`${chainId}:${pairAddress}`.toLowerCase())) || cachedSelected
  const selectedPosition = selected ? positions[`${selected.chainId}:${selected.pairAddress}`.toLowerCase()] : null

  const rows = positionList.map((p) => {
    const live = pairs.get(`${p.chainId}:${p.pairAddress}`.toLowerCase())
    const price = live ? parseFloat(live.priceUsd) : null
    const value = price !== null ? p.qty * price : null
    return { ...p, live, price, value, pnl: value !== null ? value - p.cost : null }
  })
  const holdings = rows.reduce((s, r) => s + (r.value ?? r.cost), 0)
  const equity = cash + holdings
  const totalPnl = equity - startingBalance

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trading workspace"
        description="Practice strategies with a paper account that fills against live DexScreener prices. Your account is saved in this browser."
        actions={<Button variant="ghost" onClick={() => { if (confirm('Reset your paper account? All positions and history will be cleared.')) reset() }}><RotateCcw size={15} /> Reset account</Button>}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Equity', formatUsd(equity)],
          ['Cash', formatUsd(cash)],
          ['Holdings', formatUsd(holdings)],
          ['Total P&L', <span key="pnl" className={totalPnl >= 0 ? 'text-up' : 'text-down'}>{totalPnl >= 0 ? '+' : ''}{formatUsd(totalPnl)} ({((totalPnl / startingBalance) * 100).toFixed(2)}%)</span>],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {selected ? (
            <>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <TokenAvatar pair={selected} size={36} />
                  <div>
                    <Link to={`/token/${selected.chainId}/${selected.pairAddress}`} className="font-semibold hover:text-primary">{selected.baseToken.symbol}/{selected.quoteToken?.symbol}</Link>
                    <div className="text-xs text-muted-foreground">{chainLabel(selected.chainId)} · {selected.dexId}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold tabular-nums">{formatPrice(selected.priceUsd)}</div>
                  <PriceChange value={selected.priceChange?.h24} className="text-sm" />
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate('/trade')}>Change pair</Button>
              </Card>
              <ChartEmbed chainId={selected.chainId} pairAddress={selected.pairAddress} className="h-[460px]" />
            </>
          ) : chainId ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">Loading pair…</Card>
          ) : (
            <Card>
              <CardHeader title="Choose a market" icon={CandlestickChart} subtitle="Pick any live pair to open the chart and order ticket" />
              <div className="p-4 sm:p-5"><PairPicker onPick={(p) => navigate(`/trade/${p.chainId}/${p.pairAddress}`)} /></div>
            </Card>
          )}

          <Card>
            <CardHeader title="Open positions" icon={Wallet} subtitle={`${rows.length} position${rows.length === 1 ? '' : 's'}`} />
            {rows.length === 0 ? <EmptyState icon={Wallet} title="No open positions" description="Buy a token with your paper balance to see it here." /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Token</th><th className="px-3 py-2.5 text-right font-medium">Qty</th><th className="px-3 py-2.5 text-right font-medium">Avg entry</th><th className="px-3 py-2.5 text-right font-medium">Price</th><th className="px-3 py-2.5 text-right font-medium">Value</th><th className="px-4 py-2.5 text-right font-medium">P&L</th>
                  </tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={`${r.chainId}-${r.pairAddress}`} onClick={() => navigate(`/trade/${r.chainId}/${r.pairAddress}`)} className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-3"><b>{r.symbol}</b><span className="text-xs text-muted-foreground">/{r.quote}</span></td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatCompactNumber(r.qty)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{formatPrice(r.cost / r.qty)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.price !== null ? formatPrice(r.price) : '—'}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{r.value !== null ? formatUsd(r.value) : '—'}</td>
                        <td className={cn('px-4 py-3 text-right tabular-nums', r.pnl >= 0 ? 'text-up' : 'text-down')}>{r.pnl !== null ? `${r.pnl >= 0 ? '+' : ''}${formatUsd(r.pnl)} (${((r.pnl / r.cost) * 100).toFixed(1)}%)` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader title="Order ticket" subtitle="Market order" />
            {selected ? <OrderTicket pair={selected} position={selectedPosition} /> : <p className="p-5 text-sm text-muted-foreground">Select a pair to start trading.</p>}
          </Card>
          <Card>
            <CardHeader title="Order history" icon={History} />
            {orders.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No orders yet.</p> : (
              <ul className="max-h-96 divide-y divide-border/60 overflow-y-auto">
                {orders.slice(0, 30).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs sm:px-5">
                    <div>
                      <Badge tone={o.side === 'buy' ? 'good' : 'bad'} className="uppercase">{o.side}</Badge>{' '}
                      <b className="text-sm">{o.symbol}</b>
                      <div className="mt-0.5 text-muted-foreground">{formatCompactNumber(o.qty)} @ {formatPrice(o.price)} · {timeAgo(o.at)}</div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div>{formatUsd(o.notional)}</div>
                      {typeof o.realized === 'number' && <div className={o.realized >= 0 ? 'text-up' : 'text-down'}>{o.realized >= 0 ? '+' : ''}{formatUsd(o.realized)}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}
