'use client'
import { Globe, Send, MessageSquare, Flag } from 'lucide-react'
import type { MarketToken } from '@/types'
import { formatPrice } from '@/lib/format'
import { safeUrl } from '@/lib/security/sanitize'
import type { LiveQuote } from '@/stores/realtime'
import { TokenLogo } from '@/components/token/TokenLogo'
import { PriceChange } from '@/components/token/PriceChange'
import { AddressChip } from '@/components/token/AddressChip'
import { ChainBadge, StatusBadge, VerifiedMark } from '@/components/token/badges'
import { WatchlistButton } from '@/components/token/WatchlistButton'
import { CopyButton } from '@/components/token/CopyButton'
import { DemoBadge } from '@/components/ui/feedback'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

function XIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden><path d="M18.9 2H22l-6.8 7.8L23 22h-6.3l-4.9-6.4L6.2 22H3l7.3-8.3L1 2h6.4l4.4 5.9L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z" /></svg>
}

export function TokenHeader({ t, quote, onReport }: { t: MarketToken; quote: LiveQuote | undefined; onReport: () => void }) {
  const links = [
    { href: safeUrl(t.token.socials.website), label: 'Website', icon: <Globe className="h-3.5 w-3.5" /> },
    { href: safeUrl(t.token.socials.twitter), label: 'X / Twitter', icon: <XIcon className="h-3.5 w-3.5" /> },
    { href: safeUrl(t.token.socials.telegram), label: 'Telegram', icon: <Send className="h-3.5 w-3.5" /> },
    { href: safeUrl(t.token.socials.discord), label: 'Discord', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  ].filter((l): l is { href: string; label: string; icon: React.JSX.Element } => Boolean(l.href))

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <TokenLogo src={t.token.logoUrl} symbol={t.token.symbol} size={56} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{t.token.name}</h1>
            <VerifiedMark verified={t.token.verified} size={18} />
            <span className="text-sm text-muted">{t.token.symbol} / {t.pair.quoteToken.symbol}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <ChainBadge chain={t.token.chain} />
            <StatusBadge status={t.token.status} />
            {t.source === 'demo' && <DemoBadge />}
            <span className="inline-flex items-center gap-1 text-muted">
              <AddressChip value={t.token.address} chain={t.token.chain} source={t.source} />
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 lg:justify-end">
        <div className="text-left lg:text-right">
          <div key={quote?.at} className={cn('num rounded px-1 font-display text-3xl font-semibold', quote?.direction === 'up' && 'animate-flash-up', quote?.direction === 'down' && 'animate-flash-down')}>
            {formatPrice(t.market.priceUsd)}
          </div>
          <PriceChange value={t.market.priceChange.h24} className="text-sm" />
          <span className="ml-1 text-xs text-subtle">24h</span>
        </div>
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer nofollow" aria-label={l.label} title={l.label} className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted hover:bg-white/5 hover:text-fg">{l.icon}</a>
          ))}
          <CopyButton value={t.token.address} label="Copy contract address" className="grid h-9 w-9 place-items-center rounded-xl border border-line" size={14} />
          <WatchlistButton chain={t.token.chain} address={t.token.address} symbol={t.token.symbol} withLabel className="h-9 rounded-xl border border-line px-3" />
          <Button variant="ghost" size="icon" onClick={onReport} aria-label="Report token" title="Report token"><Flag className="h-4 w-4" /></Button>
        </div>
      </div>
    </header>
  )
}
