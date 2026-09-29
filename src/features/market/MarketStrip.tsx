'use client'
import Link from 'next/link'
import type { MarketToken } from '@/types'
import { useTokenList } from '@/hooks/useMarket'
import { formatPrice } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { useLiveToken } from '@/hooks/useLiveToken'
import { PriceChange } from '@/components/token/PriceChange'
import { TokenLogo } from '@/components/token/TokenLogo'

/**
 * "Market pulse" ticker. Scrolls continuously (paused on hover/focus and for
 * users who prefer reduced motion — see globals.css).
 */
export function MarketStrip() {
  const { data } = useTokenList('trending', 'pageSize=16')
  const items = data?.items ?? []
  if (!items.length) return <div className="h-11 rounded-2xl border border-line bg-card/60" aria-hidden />
  return (
    <section aria-label="Market pulse" className="group relative flex items-center overflow-hidden rounded-2xl border border-line bg-card/60">
      <span className="z-10 flex shrink-0 items-center gap-2 border-r border-line bg-card px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up" aria-hidden /> Market pulse
      </span>
      <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
        <ul className="marquee flex w-max animate-marquee gap-6 py-3 pl-4 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
          {[...items, ...items].map((t, i) => <StripItem key={`${t.token.address}-${i}`} t={t} hidden={i >= items.length} />)}
        </ul>
      </div>
    </section>
  )
}

function StripItem({ t: raw, hidden }: { t: MarketToken; hidden: boolean }) {
  const { token: t } = useLiveToken(raw)
  return (
    <li aria-hidden={hidden || undefined}>
      <Link href={tokenPath(t.token.chain, t.token.address)} tabIndex={hidden ? -1 : undefined} className="flex items-center gap-2 whitespace-nowrap text-[13px] hover:text-primary">
        <TokenLogo src={t.token.logoUrl} symbol={t.token.symbol} size={18} />
        <span className="font-semibold">{t.token.symbol}</span>
        <span className="num text-muted">{formatPrice(t.market.priceUsd)}</span>
        <PriceChange value={t.market.priceChange.h24} className="text-xs" />
      </Link>
    </li>
  )
}
