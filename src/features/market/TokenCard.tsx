'use client'
import Link from 'next/link'
import { memo } from 'react'
import { MessageCircle } from 'lucide-react'
import type { MarketToken } from '@/types'
import { formatAge, formatPrice, formatUsdCompact } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { useLiveToken } from '@/hooks/useLiveToken'
import { TokenLogo } from '@/components/token/TokenLogo'
import { PriceChange } from '@/components/token/PriceChange'
import { ChainBadge, StatusBadge, VerifiedMark } from '@/components/token/badges'
import { Skeleton } from '@/components/ui/primitives'
import { CurveProgress } from './TokenTable'

/** Launch-style card used for new tokens, gainers and trending rails. */
export const TokenCard = memo(function TokenCard({ token: raw, now, variant = 'default' }: { token: MarketToken; now: number; variant?: 'default' | 'launch' }) {
  const { token: t } = useLiveToken(raw)
  return (
    <Link href={tokenPath(t.token.chain, t.token.address)} className="group block rounded-2xl border border-line bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:bg-elevated/60">
      <div className="flex items-start gap-3">
        <TokenLogo src={t.token.logoUrl} symbol={t.token.symbol} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold">{t.token.symbol}</span>
            <VerifiedMark verified={t.token.verified} size={13} />
            <span className="ml-auto"><StatusBadge status={t.token.status} /></span>
          </div>
          <div className="truncate text-xs text-muted">{t.token.name}</div>
        </div>
      </div>
      {variant === 'launch' && t.token.description && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">{t.token.description}</p>}
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="num text-[15px] font-semibold">{formatPrice(t.market.priceUsd)}</div>
          <div className="num text-[11px] text-muted">MC {formatUsdCompact(t.market.marketCap)}</div>
        </div>
        <PriceChange value={t.market.priceChange.h24} className="text-sm" />
      </div>
      {t.token.status !== 'listed' && <CurveProgress t={t} className="ml-0 mt-3 w-full" />}
      <div className="mt-3 flex items-center gap-2 text-[11px] text-subtle">
        <ChainBadge chain={t.token.chain} />
        <span className="num">{formatAge(t.token.createdAt, now)}</span>
        <span className="ml-auto inline-flex items-center gap-1"><MessageCircle className="h-3 w-3" aria-hidden /> <span className="num">{t.social.comments}</span></span>
      </div>
    </Link>
  )
})

export function TokenCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-2.5 w-24" /></div></div>
      <Skeleton className="mt-4 h-4 w-20" />
      <Skeleton className="mt-3 h-1.5 w-full" />
    </div>
  )
}
