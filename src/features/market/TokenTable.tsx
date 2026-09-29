'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, SearchX } from 'lucide-react'
import type { MarketToken } from '@/types'
import { cn } from '@/lib/cn'
import { formatAge, formatCompact, formatInteger, formatPrice, formatUsdCompact, shortAddress } from '@/lib/format'
import { buyRatio, paginate, sortTokens, type SortDirection, type SortKey } from '@/lib/market/sorting'
import { tokenPath } from '@/lib/paths'
import { useLiveToken } from '@/hooks/useLiveToken'
import { useNow } from '@/hooks/useNow'
import { TokenLogo } from '@/components/token/TokenLogo'
import { PriceChange } from '@/components/token/PriceChange'
import { ChainDot, StatusBadge, VerifiedMark } from '@/components/token/badges'
import { WatchlistButton } from '@/components/token/WatchlistButton'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorState, DemoBadge } from '@/components/ui/feedback'
import { NETWORKS } from '@/lib/blockchain/chains'

export type ColumnKey = 'token' | 'price' | 'change1h' | 'change6h' | 'change24h' | 'volume' | 'liquidity' | 'marketCap' | 'txns' | 'buyRatio' | 'age' | 'creator' | 'progress' | 'dex'

interface ColumnDef {
  label: string
  sort?: SortKey
  align?: 'left' | 'right'
  className?: string
  title?: string
}

const COLUMNS: Record<ColumnKey, ColumnDef> = {
  token: { label: 'Token', align: 'left' },
  price: { label: 'Price', sort: 'price', align: 'right' },
  change1h: { label: '1H', sort: 'change1h', align: 'right' },
  change6h: { label: '6H', sort: 'change6h', align: 'right' },
  change24h: { label: '24H', sort: 'change24h', align: 'right' },
  volume: { label: 'Volume', sort: 'volume', align: 'right', title: '24h volume' },
  liquidity: { label: 'Liquidity', sort: 'liquidity', align: 'right' },
  marketCap: { label: 'Mkt Cap', sort: 'marketCap', align: 'right' },
  txns: { label: 'Txns', sort: 'txns', align: 'right', title: '24h transactions' },
  buyRatio: { label: 'Buys / Sells', sort: 'buyRatio', align: 'right', className: 'w-[120px]' },
  age: { label: 'Age', sort: 'age', align: 'right' },
  creator: { label: 'Creator', align: 'right' },
  progress: { label: 'Curve', sort: 'progress', align: 'right', className: 'w-[120px]', title: 'Bonding-curve progress toward migration' },
  dex: { label: 'DEX', align: 'right' },
}

export const DEFAULT_COLUMNS: ColumnKey[] = ['token', 'price', 'change1h', 'change6h', 'change24h', 'volume', 'liquidity', 'marketCap', 'txns', 'buyRatio']

export interface TokenTableProps {
  tokens: MarketToken[] | undefined
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  columns?: ColumnKey[]
  /** Initial sort. Pass `null` to keep the provided order (e.g. server-ranked lists). */
  initialSort?: { key: SortKey; dir: SortDirection } | null
  pageSize?: number
  showRank?: boolean
  emptyTitle?: string
  emptyDescription?: string
  caption: string
}

export function TokenTable({ tokens, loading, error, onRetry, columns = DEFAULT_COLUMNS, initialSort = null, pageSize = 25, showRank = true, emptyTitle = 'No tokens found', emptyDescription = 'Try widening your filters.', caption }: TokenTableProps) {
  const [sort, setSort] = useState(initialSort)
  const [page, setPage] = useState(1)
  const router = useRouter()
  const now = useNow(30_000)

  const sorted = useMemo(() => (tokens && sort ? sortTokens(tokens, sort.key, sort.dir) : tokens ?? []), [tokens, sort])
  const pageData = useMemo(() => paginate(sorted, page, pageSize), [sorted, page, pageSize])

  const toggleSort = (key: SortKey) => {
    setPage(1)
    setSort((s) => (s?.key === key ? (s.dir === 'desc' ? { key, dir: 'asc' } : null) : { key, dir: 'desc' }))
  }

  if (error && !tokens?.length) return <ErrorState title="Couldn't load markets" message={error} onRetry={onRetry} />
  if (!loading && tokens && tokens.length === 0) return <EmptyState icon={<SearchX className="h-5 w-5" />} title={emptyTitle} description={emptyDescription} />

  const offset = (pageData.page - 1) * pageSize
  return (
    <div>
      {/* Desktop / tablet: dense table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-[13px]">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.06em] text-subtle">
              {showRank && <th scope="col" className="w-10 border-b border-line py-2.5 pl-4 text-left font-medium">#</th>}
              {columns.map((c) => {
                const def = COLUMNS[c]
                const active = def.sort && sort?.key === def.sort
                return (
                  <th key={c} scope="col" aria-sort={active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('whitespace-nowrap border-b border-line px-3 py-2.5 font-medium', def.align === 'right' ? 'text-right' : 'text-left', def.className, c === 'token' && !showRank && 'pl-4')}>
                    {def.sort ? (
                      <button type="button" onClick={() => def.sort && toggleSort(def.sort)} title={def.title} className={cn('inline-flex items-center gap-1 uppercase hover:text-fg', active && 'text-fg')}>
                        {def.label}
                        {active && (sort?.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    ) : def.label}
                  </th>
                )
              })}
              <th scope="col" className="w-10 border-b border-line pr-3"><span className="sr-only">Watch</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && !tokens
              ? Array.from({ length: 8 }, (_, i) => (
                  <tr key={i}>
                    {showRank && <td className="border-b border-line py-3 pl-4"><Skeleton className="h-3 w-4" /></td>}
                    {columns.map((c) => <td key={c} className="border-b border-line px-3 py-3">{c === 'token' ? <div className="flex items-center gap-2.5"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-1.5"><Skeleton className="h-3 w-16" /><Skeleton className="h-2.5 w-24" /></div></div> : <Skeleton className="ml-auto h-3 w-14" />}</td>)}
                    <td className="border-b border-line" />
                  </tr>
                ))
              : pageData.items.map((t, i) => (
                  <TokenRow key={`${t.token.chain}:${t.token.address}`} t={t} rank={showRank ? offset + i + 1 : null} columns={columns} now={now} onOpen={() => router.push(tokenPath(t.token.chain, t.token.address))} />
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="divide-y divide-line md:hidden">
        {loading && !tokens
          ? Array.from({ length: 6 }, (_, i) => <li key={i} className="flex items-center gap-3 p-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-40" /></div></li>)
          : pageData.items.map((t, i) => <TokenMobileRow key={`${t.token.chain}:${t.token.address}`} t={t} rank={showRank ? offset + i + 1 : null} columns={columns} now={now} />)}
      </ul>

      {pageData.pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-muted">
          <span className="num">{offset + 1}–{Math.min(offset + pageSize, pageData.total)} of {formatInteger(pageData.total)}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => p - 1)} disabled={pageData.page <= 1} className="rounded-lg border border-line p-1.5 hover:bg-white/5 disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            <span className="num px-2">Page {pageData.page} / {pageData.pages}</span>
            <button type="button" onClick={() => setPage((p) => p + 1)} disabled={pageData.page >= pageData.pages} className="rounded-lg border border-line p-1.5 hover:bg-white/5 disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </nav>
      )}
    </div>
  )
}

function TokenIdentity({ t, compact = false }: { t: MarketToken; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="relative shrink-0">
        <TokenLogo src={t.token.logoUrl} symbol={t.token.symbol} size={compact ? 36 : 32} />
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-card leading-none" title={NETWORKS[t.token.chain].name}><ChainDot chain={t.token.chain} /></span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Link href={tokenPath(t.token.chain, t.token.address)} className="truncate font-semibold hover:text-primary focus-visible:text-primary" onClick={(e) => e.stopPropagation()}>
            {t.token.symbol}
          </Link>
          <span className="text-[11px] text-subtle">/{t.pair.quoteToken.symbol}</span>
          <VerifiedMark verified={t.token.verified} size={13} />
          <StatusBadge status={t.token.status} />
        </div>
        <div className="flex items-center gap-1.5 truncate text-[11.5px] text-muted">
          <span className="truncate">{t.token.name}</span>
          {t.source === 'demo' && <DemoBadge label="Demo" className="px-1 py-0 text-[9px]" />}
        </div>
      </div>
    </div>
  )
}

function BuySellBar({ t }: { t: MarketToken }) {
  const { buys, sells } = t.market.txns.h24
  const ratio = buyRatio(t)
  return (
    <div className="ml-auto w-[110px]" title={`${formatInteger(buys)} buys / ${formatInteger(sells)} sells (24h)`}>
      <div className="num flex justify-between text-[11px]"><span className="text-up">{formatCompact(buys)}</span><span className="text-down">{formatCompact(sells)}</span></div>
      <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-down/60" aria-hidden><div className="bg-up" style={{ width: `${ratio * 100}%` }} /></div>
    </div>
  )
}

export function CurveProgress({ t, className }: { t: MarketToken; className?: string }) {
  if (t.token.status === 'listed') return <span className="text-subtle">—</span>
  const p = t.token.status === 'migrated' ? 1 : t.curve?.progress ?? 0
  return (
    <div className={cn('ml-auto w-[104px]', className)} aria-label={`Curve progress ${(p * 100).toFixed(0)}%`}>
      <div className="num text-right text-[11px] text-muted">{t.token.status === 'migrated' ? 'Graduated' : `${(p * 100).toFixed(1)}%`}</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-primary to-gold" style={{ width: `${Math.max(2, p * 100)}%` }} /></div>
    </div>
  )
}

function Cell({ t, col, now }: { t: MarketToken; col: ColumnKey; now: number }) {
  const m = t.market
  switch (col) {
    case 'price': return <span className="num font-medium">{formatPrice(m.priceUsd)}</span>
    case 'change1h': return <PriceChange value={m.priceChange.h1} showIcon={false} />
    case 'change6h': return <PriceChange value={m.priceChange.h6} showIcon={false} />
    case 'change24h': return <PriceChange value={m.priceChange.h24} />
    case 'volume': return <span className="num">{formatUsdCompact(m.volume.h24)}</span>
    case 'liquidity': return <span className="num">{formatUsdCompact(m.liquidityUsd)}</span>
    case 'marketCap': return <span className="num">{formatUsdCompact(m.marketCap)}</span>
    case 'txns': return <span className="num">{formatCompact(m.txns.h24.buys + m.txns.h24.sells)}</span>
    case 'buyRatio': return <BuySellBar t={t} />
    case 'age': return <span className="num text-muted">{formatAge(t.token.createdAt, now)}</span>
    case 'creator': return t.token.creator ? <Link href={`/profile/${t.token.creator}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs text-muted hover:text-fg">{shortAddress(t.token.creator)}</Link> : <span className="text-subtle">—</span>
    case 'progress': return <CurveProgress t={t} />
    case 'dex': return <span className="text-muted">{t.pair.dexName}</span>
    default: return null
  }
}

const TokenRow = memo(function TokenRow({ t: raw, rank, columns, now, onOpen }: { t: MarketToken; rank: number | null; columns: ColumnKey[]; now: number; onOpen: () => void }) {
  const { token: t, quote } = useLiveToken(raw)
  return (
    <tr onClick={onOpen} className="group cursor-pointer transition-colors hover:bg-white/[0.025]">
      {rank !== null && <td className="num border-b border-line py-2.5 pl-4 text-xs text-subtle">{rank}</td>}
      {columns.map((c) => (
        <td key={c} className={cn('whitespace-nowrap border-b border-line px-3 py-2.5', COLUMNS[c].align === 'right' ? 'text-right' : 'text-left', c === 'token' && rank === null && 'pl-4')}>
          {c === 'token' ? <TokenIdentity t={t} /> : c === 'price' && quote ? (
            <span key={quote.at} className={cn('num rounded px-1 font-medium', quote.direction === 'up' && 'animate-flash-up', quote.direction === 'down' && 'animate-flash-down')}>{formatPrice(t.market.priceUsd)}</span>
          ) : <Cell t={t} col={c} now={now} />}
        </td>
      ))}
      <td className="border-b border-line pr-3 text-right"><WatchlistButton chain={t.token.chain} address={t.token.address} symbol={t.token.symbol} /></td>
    </tr>
  )
})

const TokenMobileRow = memo(function TokenMobileRow({ t: raw, rank, columns, now }: { t: MarketToken; rank: number | null; columns: ColumnKey[]; now: number }) {
  const { token: t } = useLiveToken(raw)
  const showCurve = columns.includes('progress') && t.token.status !== 'listed'
  return (
    <li>
      <Link href={tokenPath(t.token.chain, t.token.address)} className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.03]">
        {rank !== null && <span className="num w-5 shrink-0 text-xs text-subtle">{rank}</span>}
        <div className="min-w-0 flex-1"><TokenIdentity t={t} compact /></div>
        <div className="shrink-0 text-right">
          <div className="num text-sm font-semibold">{formatPrice(t.market.priceUsd)}</div>
          <PriceChange value={t.market.priceChange.h24} className="text-xs" />
        </div>
      </Link>
      <div className="num -mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3 pl-[4.25rem] text-[11px] text-muted">
        <span>MC <span className="text-fg">{formatUsdCompact(t.market.marketCap)}</span></span>
        <span>Vol <span className="text-fg">{formatUsdCompact(t.market.volume.h24)}</span></span>
        <span>Liq <span className="text-fg">{formatUsdCompact(t.market.liquidityUsd)}</span></span>
        {columns.includes('age') && <span>{formatAge(t.token.createdAt, now)}</span>}
        {showCurve && <CurveProgress t={t} className="ml-0 w-24" />}
      </div>
    </li>
  )
})
