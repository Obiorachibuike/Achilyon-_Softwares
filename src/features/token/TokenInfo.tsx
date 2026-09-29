import Link from 'next/link'
import type { MarketToken, TradingPair } from '@/types'
import { formatCompact, formatDateTime, formatUsdCompact, shortAddress } from '@/lib/format'
import { NETWORKS } from '@/lib/blockchain/chains'
import { AddressChip } from '@/components/token/AddressChip'
import { Card, CardHeader } from '@/components/ui/primitives'

export function TokenInfo({ t, pairs }: { t: MarketToken; pairs: TradingPair[] }) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Network', value: NETWORKS[t.token.chain].name },
    { label: 'Contract', value: <AddressChip value={t.token.address} chain={t.token.chain} source={t.source} /> },
    { label: 'Pair', value: <AddressChip value={t.pair.address} chain={t.token.chain} source={t.source} /> },
    { label: 'DEX', value: t.pair.dexName },
    { label: 'Total supply', value: t.token.totalSupply ? formatCompact(t.token.totalSupply) : '—' },
    { label: 'Decimals', value: t.token.decimals },
    { label: 'Created', value: formatDateTime(t.token.createdAt) },
    { label: 'Creator', value: t.token.creator ? <Link href={`/profile/${t.token.creator}`} className="font-mono text-[12px] text-primary hover:underline">{shortAddress(t.token.creator)}</Link> : '—' },
  ]
  return (
    <Card className="p-4">
      <CardHeader title={`About ${t.token.symbol}`} className="mb-3 p-0" />
      {t.token.description ? <p className="whitespace-pre-line break-words text-[13px] leading-relaxed text-muted">{t.token.description}</p> : <p className="text-[13px] text-subtle">No description provided.</p>}
      <dl className="mt-4 space-y-2 text-[12.5px]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3">
            <dt className="text-muted">{r.label}</dt>
            <dd className="num min-w-0 truncate text-right">{r.value}</dd>
          </div>
        ))}
      </dl>
      {pairs.length > 1 && (
        <div className="mt-4 border-t border-line pt-3">
          <div className="label mb-2">Other pools</div>
          <ul className="space-y-1.5 text-[12.5px]">
            {pairs.filter((p) => p.address !== t.pair.address).slice(0, 5).map((p) => (
              <li key={p.address} className="flex justify-between gap-2">
                <span className="text-muted">{p.baseToken.symbol}/{p.quoteToken.symbol} · {p.dexName}</span>
                <span className="num">{formatUsdCompact(p.liquidityUsd)} liq</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
