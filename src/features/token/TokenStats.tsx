import type { MarketToken } from '@/types'
import { formatCompact, formatInteger, formatUsdCompact, formatAge } from '@/lib/format'
import { PriceChange } from '@/components/token/PriceChange'

/** Key metrics strip under the token header. */
export function TokenStats({ t, now }: { t: MarketToken; now: number }) {
  const m = t.market
  const { buys, sells } = m.txns.h24
  const stats: { label: string; value: React.ReactNode; title?: string }[] = [
    { label: 'Market cap', value: formatUsdCompact(m.marketCap) },
    { label: 'FDV', value: formatUsdCompact(m.fdv) },
    { label: t.token.status === 'bonding' ? 'Curve liquidity' : 'Liquidity', value: formatUsdCompact(m.liquidityUsd), title: t.token.status === 'bonding' ? 'Quote raised in the bonding curve' : undefined },
    { label: 'Volume 24h', value: formatUsdCompact(m.volume.h24) },
    { label: 'Txns 24h', value: <>{formatCompact(buys + sells)} <span className="text-[11px] text-muted">(<span className="text-up">{formatCompact(buys)}</span>/<span className="text-down">{formatCompact(sells)}</span>)</span></> },
    { label: 'Holders', value: m.holders === null ? <span className="text-subtle" title="Holder counts need an indexer for live tokens">n/a</span> : formatInteger(m.holders) },
    { label: 'Age', value: formatAge(t.token.createdAt, now) },
  ]
  const changes = [
    { label: '5M', v: m.priceChange.m5 },
    { label: '1H', v: m.priceChange.h1 },
    { label: '6H', v: m.priceChange.h6 },
    { label: '24H', v: m.priceChange.h24 },
  ]
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4 xl:grid-cols-7">
        {stats.map((s) => (
          <div key={s.label} className="bg-card px-3.5 py-3" title={s.title}>
            <dt className="label">{s.label}</dt>
            <dd className="num mt-1 text-[15px] font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="grid grid-cols-4 gap-px overflow-hidden rounded-2xl border border-line bg-line">
        {changes.map((c) => (
          <div key={c.label} className="bg-card px-3.5 py-3 text-center">
            <dt className="label">{c.label}</dt>
            <dd className="mt-1 text-[14px] font-semibold"><PriceChange value={c.v} showIcon={false} /></dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
