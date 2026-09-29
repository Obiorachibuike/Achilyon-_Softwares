'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownLeft, Layers, Loader2, Search, ShieldCheck, User, History, ArrowRight } from 'lucide-react'
import { useSearch } from '@/hooks/useMarket'
import { useDebounce } from '@/hooks/useDebounce'
import { useRecentStore } from '@/stores/recent'
import { detectAddressKind, NETWORKS } from '@/lib/blockchain/chains'
import { formatPrice, formatUsdCompact, shortAddress } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { cn } from '@/lib/cn'
import { TokenLogo } from '@/components/token/TokenLogo'
import { ChainBadge, VerifiedMark } from '@/components/token/badges'
import { Kbd } from '@/components/ui/primitives'
import { DemoBadge } from '@/components/ui/feedback'
import { ALL_NAV } from './nav'

type ResultItem = {
  id: string
  group: string
  href: string
  render: React.ReactNode
}

/**
 * Command-style global search. Debounced server search across token name,
 * ticker, contract, pair and creator addresses, plus navigation shortcuts.
 * Keyboard: ↑/↓ to move, Enter to open, Esc to close.
 */
export function SearchCommand({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounced = useDebounce(query, 220)
  const { data, isFetching, isError } = useSearch(debounced)
  const recent = useRecentStore((s) => s.items)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setQuery(''); setActive(0) }
  }

  useEffect(() => {
    if (!open) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => inputRef.current?.focus())
    return () => { document.body.style.overflow = overflow }
  }, [open])

  const items = useMemo<ResultItem[]>(() => {
    const q = query.trim()
    const out: ResultItem[] = []
    if (!q) {
      recent.slice(0, 5).forEach((r) => out.push({
        id: `recent-${r.chain}-${r.address}`, group: 'Recently viewed', href: tokenPath(r.chain, r.address),
        render: <Row icon={<TokenLogo src={r.logoUrl} symbol={r.symbol} size={28} />} title={r.symbol} subtitle={r.name} right={<History className="h-3.5 w-3.5 text-subtle" />} />,
      }))
      ALL_NAV.slice(0, 8).forEach((n) => out.push({ id: `nav-${n.href}`, group: 'Go to', href: n.href, render: <Row icon={<n.icon className="h-4 w-4 text-subtle" />} title={n.label} right={<ArrowRight className="h-3.5 w-3.5 text-subtle" />} /> }))
      return out
    }
    if (debounced.trim() === q && data) {
      data.tokens.forEach((t) => out.push({
        id: `t-${t.token.chain}-${t.token.address}`, group: 'Tokens', href: tokenPath(t.token.chain, t.token.address),
        render: (
          <Row
            icon={<TokenLogo src={t.token.logoUrl} symbol={t.token.symbol} size={30} />}
            title={<span className="flex items-center gap-1.5">{t.token.symbol}<VerifiedMark verified={t.token.verified} size={12} /><ChainBadge chain={t.token.chain} />{t.source === 'demo' && <DemoBadge label="Demo" />}</span>}
            subtitle={t.token.name}
            right={<div className="text-right"><div className="num text-sm">{formatPrice(t.market.priceUsd)}</div><div className="num text-[11px] text-muted">MC {formatUsdCompact(t.market.marketCap)}</div></div>}
          />
        ),
      }))
      data.pairs.forEach((p) => out.push({
        id: `p-${p.chain}-${p.address}`, group: 'Pairs', href: tokenPath(p.chain, p.baseToken.address),
        render: <Row icon={<Layers className="h-4 w-4 text-subtle" />} title={`${p.baseToken.symbol} / ${p.quoteToken.symbol}`} subtitle={`${p.dexName} · ${NETWORKS[p.chain].name} · ${shortAddress(p.address)}`} right={<div className="text-right text-[11px] text-muted"><div className="num">Liq {formatUsdCompact(p.liquidityUsd)}</div><div className="num">Vol {formatUsdCompact(p.volume24h)}</div></div>} />,
      }))
      data.creators.forEach((c) => out.push({
        id: `c-${c.address}`, group: 'Creators', href: `/profile/${c.address}`,
        render: <Row icon={<User className="h-4 w-4 text-subtle" />} title={shortAddress(c.address, 6)} subtitle={`${c.tokens} token${c.tokens === 1 ? '' : 's'} created`} />,
      }))
    }
    const kind = detectAddressKind(q)
    if (kind) {
      out.push({ id: 'analyze', group: 'Actions', href: `/analyzer?address=${encodeURIComponent(q)}`, render: <Row icon={<ShieldCheck className="h-4 w-4 text-primary" />} title="Analyze contract" subtitle={`Run security checks on ${shortAddress(q)}`} /> })
      out.push({ id: 'profile', group: 'Actions', href: `/profile/${q}`, render: <Row icon={<User className="h-4 w-4 text-subtle" />} title="View wallet profile" subtitle={shortAddress(q, 6)} /> })
    }
    ALL_NAV.filter((n) => n.label.toLowerCase().includes(q.toLowerCase())).forEach((n) => out.push({ id: `nav-${n.href}`, group: 'Go to', href: n.href, render: <Row icon={<n.icon className="h-4 w-4 text-subtle" />} title={n.label} /> }))
    return out
  }, [query, debounced, data, recent])

  const clampedActive = Math.min(active, Math.max(0, items.length - 1))

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${clampedActive}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [clampedActive])

  if (!open) return null

  const go = (href: string) => {
    onClose()
    router.push(href)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items[clampedActive]; if (it) go(it.href) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    else if (e.key === 'Tab') e.preventDefault()
  }

  let lastGroup = ''
  const activeId = items[clampedActive]?.id
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 pt-[8vh] sm:p-6 sm:pt-[12vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-[#020409]/75 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Search" className="relative w-full max-w-2xl animate-pop overflow-hidden rounded-2xl border border-line-strong bg-card shadow-2xl shadow-black/60">
        <div className="flex items-center gap-3 border-b border-line px-4">
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden /> : <Search className="h-4 w-4 text-muted" aria-hidden />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            placeholder="Search token, ticker, contract, pair or creator…"
            className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={activeId ? `sr-${activeId}` : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            maxLength={80}
          />
          <Kbd>ESC</Kbd>
        </div>
        <ul id="search-results" ref={listRef} role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted">
              {isError ? 'Search is temporarily unavailable.' : isFetching || debounced !== query ? 'Searching…' : `No results for “${query}”.`}
            </li>
          )}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null
            lastGroup = it.group
            return (
              <li key={it.id} role="presentation">
                {header && <div className="px-3 pb-1 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle">{header}</div>}
                <div
                  id={`sr-${it.id}`}
                  role="option"
                  aria-selected={i === clampedActive}
                  data-index={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(it.href)}
                  className={cn('cursor-pointer rounded-xl px-3 py-2', i === clampedActive ? 'bg-white/[0.06]' : '')}
                >
                  {it.render}
                </div>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-subtle">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd><CornerDownLeft className="h-2.5 w-2.5" /></Kbd> open</span>
          <span className="ml-auto hidden sm:block">Search by contract address works across all supported chains</span>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, title, subtitle, right }: { icon: React.ReactNode; title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle && <div className="truncate text-xs text-muted">{subtitle}</div>}
      </div>
      {right}
    </div>
  )
}
