'use client'
import Link from 'next/link'
import type { MarketToken } from '@/types'
import { formatPrice, formatUsdCompact } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { useLiveToken } from '@/hooks/useLiveToken'
import { TokenLogo } from '@/components/token/TokenLogo'
import { PriceChange } from '@/components/token/PriceChange'
import { Skeleton } from '@/components/ui/primitives'

/** Compact ranked list for dashboards (gainers, losers, recently viewed). */
export function MiniTokenList({ tokens, loading, empty = 'Nothing here yet', metric = 'volume' }: { tokens: MarketToken[] | undefined; loading?: boolean; empty?: string; metric?: 'volume' | 'marketCap' }) {
  if (loading && !tokens) return <ul className="space-y-1 p-2">{Array.from({ length: 5 }, (_, i) => <li key={i} className="flex items-center gap-3 p-2"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-3 flex-1" /></li>)}</ul>
  if (!tokens?.length) return <p className="p-6 text-center text-sm text-muted">{empty}</p>
  return (
    <ol className="p-2">
      {tokens.map((t, i) => <Row key={`${t.token.chain}:${t.token.address}`} t={t} rank={i + 1} metric={metric} />)}
    </ol>
  )
}

function Row({ t: raw, rank, metric }: { t: MarketToken; rank: number; metric: 'volume' | 'marketCap' }) {
  const { token: t } = useLiveToken(raw)
  return (
    <li>
      <Link href={tokenPath(t.token.chain, t.token.address)} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.035]">
        <span className="num w-4 text-xs text-subtle">{rank}</span>
        <TokenLogo src={t.token.logoUrl} symbol={t.token.symbol} size={30} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{t.token.symbol}</div>
          <div className="num truncate text-[11px] text-muted">{metric === 'volume' ? 'Vol' : 'MC'} {formatUsdCompact(metric === 'volume' ? t.market.volume.h24 : t.market.marketCap)}</div>
        </div>
        <div className="text-right">
          <div className="num text-[13px]">{formatPrice(t.market.priceUsd)}</div>
          <PriceChange value={t.market.priceChange.h24} className="text-xs" />
        </div>
      </Link>
    </li>
  )
}
