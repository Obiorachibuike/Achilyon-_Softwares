import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Sun, Moon, RefreshCw, Star, CornerDownLeft, Loader2, ShieldCheck, BellRing } from 'lucide-react'
import { NAV_ITEMS } from '../nav'
import { TokenAvatar } from './ui'
import useThemeStore from '../store/useThemeStore'
import useMarketStore from '../store/useMarketStore'
import useWatchlistStore from '../store/useWatchlistStore'
import { dexService } from '../services/api'
import { dedupePairs, matchesQuery } from '../lib/market'
import { detectAddressKind } from '../lib/risk'
import { chainLabel } from '../config'
import { cn, formatPrice } from '../lib/utils'
import useDebounce from '../hooks/useDebounce'

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [remote, setRemote] = useState({ q: '', pairs: [], loading: false })
  const debounced = useDebounce(query, 300)
  const { theme, toggleTheme } = useThemeStore()
  const pairs = useMarketStore((s) => s.pairs)
  const fetchMarket = useMarketStore((s) => s.fetchMarket)
  const watchlist = useWatchlistStore((s) => s.items)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    const q = debounced.trim()
    if (!open || q.length < 2) { setRemote({ q: '', pairs: [], loading: false }); return undefined }
    let cancelled = false
    setRemote((r) => ({ ...r, loading: true }))
    dexService.search(q)
      .then((res) => { if (!cancelled) setRemote({ q, pairs: res.slice(0, 12), loading: false }) })
      .catch(() => { if (!cancelled) setRemote({ q, pairs: [], loading: false }) })
    return () => { cancelled = true }
  }, [debounced, open])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = []
    const go = (to) => () => navigate(to)

    NAV_ITEMS.filter((n) => !q || n.label.toLowerCase().includes(q)).forEach((n) =>
      out.push({ id: `nav-${n.to}`, group: 'Navigate', label: n.label, icon: n.icon, run: go(n.to) }))

    const actions = [
      { id: 'theme', label: theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode', icon: theme === 'light' ? Moon : Sun, run: toggleTheme, keywords: 'theme dark light mode' },
      { id: 'refresh', label: 'Refresh market data', icon: RefreshCw, run: () => fetchMarket(), keywords: 'reload update' },
      { id: 'new-alert', label: 'Manage price alerts', icon: BellRing, run: go('/alerts'), keywords: 'notify alert' },
    ]
    actions.filter((a) => !q || `${a.label} ${a.keywords}`.toLowerCase().includes(q)).forEach((a) => out.push({ ...a, group: 'Actions' }))

    const kind = detectAddressKind(query)
    if (kind) {
      out.push({ id: 'analyze', group: 'Actions', label: `Analyze contract ${query.trim().slice(0, 10)}…`, icon: ShieldCheck, run: go(`/analyzer?address=${encodeURIComponent(query.trim())}`) })
    }

    watchlist
      .filter((w) => !q || `${w.symbol} ${w.name}`.toLowerCase().includes(q))
      .slice(0, 6)
      .forEach((w) => out.push({ id: `w-${w.chainId}-${w.pairAddress}`, group: 'Watchlist', label: `${w.symbol}/${w.quote}`, hint: chainLabel(w.chainId), icon: Star, run: go(`/token/${w.chainId}/${w.pairAddress}`) }))

    if (q) {
      const local = pairs.filter((p) => matchesQuery(p, q))
      const merged = dedupePairs(local, remote.q === debounced.trim() ? remote.pairs : [])
        .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
        .slice(0, 10)
      merged.forEach((p) => out.push({
        id: `t-${p.chainId}-${p.pairAddress}`,
        group: 'Tokens',
        label: `${p.baseToken.symbol}/${p.quoteToken?.symbol}`,
        hint: `${chainLabel(p.chainId)} · ${formatPrice(p.priceUsd)}`,
        avatar: p,
        run: go(`/token/${p.chainId}/${p.pairAddress}`),
      }))
    }
    return out
  }, [query, debounced, remote, pairs, watchlist, theme, toggleTheme, fetchMarket, navigate])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  const runItem = (item) => { onClose(); item?.run() }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); runItem(items[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }

  let lastGroup = null
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-3 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="palette w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search size={18} className="text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tokens, pages, actions… or paste a contract address"
            className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
          />
          {remote.loading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
        </div>
        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-10 text-center text-sm text-muted-foreground">{remote.loading ? 'Searching DexScreener…' : 'No results.'}</p>
          )}
          {items.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            const Icon = item.icon
            return (
              <div key={item.id}>
                {header && <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{header}</p>}
                <button
                  type="button"
                  id={`palette-${item.id}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  onMouseMove={() => setActive(index)}
                  onClick={() => runItem(item)}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm', index === active ? 'bg-primary/15 text-foreground' : 'text-muted-foreground')}
                >
                  {item.avatar ? <TokenAvatar pair={item.avatar} size={22} /> : Icon && <Icon size={17} />}
                  <span className="flex-1 truncate font-medium text-foreground">{item.label}</span>
                  {item.hint && <span className="truncate text-xs text-muted-foreground">{item.hint}</span>}
                  {index === active && <CornerDownLeft size={14} className="text-muted-foreground" />}
                </button>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  )
}
