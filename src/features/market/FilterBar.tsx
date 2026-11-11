'use client'
import { useState, useMemo } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { ChainId } from '@/types'
import { DEFAULT_FILTERS, countActiveFilters, type MarketFilters, type MarketCapTier } from '@/lib/market/filters'
import { FILTER_CHAINS, NETWORKS } from '@/lib/blockchain/chains'
import { DEXES, dexesForChain } from '@/lib/blockchain/dexes'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

const LIQ_OPTIONS = [
  { v: 0, l: 'Any liq' },
  { v: 10_000, l: '> $10k' },
  { v: 100_000, l: '> $100k' },
  { v: 1_000_000, l: '> $1m' },
]

const VOL_OPTIONS = [
  { v: 0, l: 'Any vol' },
  { v: 10_000, l: '> $10k' },
  { v: 100_000, l: '> $100k' },
  { v: 1_000_000, l: '> $1m' },
]

const AGE_OPTIONS = [
  { v: 0, l: 'Any age' },
  { v: 1, l: '< 1h' },
  { v: 6, l: '< 6h' },
  { v: 24, l: '< 24h' },
  { v: 168, l: '< 7d' },
  { v: 720, l: '< 30d' },
]

const MCAP_TIERS: { v: MarketCapTier; l: string }[] = [
  { v: 'all', l: 'All MCAP' },
  { v: 'micro', l: 'Micro (<$1M)' },
  { v: 'small', l: 'Small ($1M–$10M)' },
  { v: 'mid', l: 'Mid ($10M–$100M)' },
  { v: 'large', l: 'Large (>$100M)' },
]

/**
 * Reusable market filter bar with top quick filter selectors
 * and expanded advanced filters. Controlled by a `MarketFilters` value.
 */
export function FilterBar({ value, onChange, hide = [], className }: { value: MarketFilters; onChange: (f: MarketFilters) => void; hide?: (keyof MarketFilters)[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const active = countActiveFilters(value)
  const set = <K extends keyof MarketFilters>(k: K, v: MarketFilters[K]) => onChange({ ...value, [k]: v })
  const show = (k: keyof MarketFilters) => !hide.includes(k)

  // Dynamic DEX list based on selected network
  const availableDexes = useMemo(() => {
    if (value.chain === 'all') return DEXES
    return dexesForChain(value.chain)
  }, [value.chain])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Chain Selector */}
        {show('chain') && (
          <div role="radiogroup" aria-label="Network" className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-bg-2 p-0.5 scrollbar-none">
            {(['all', ...FILTER_CHAINS] as (ChainId | 'all')[]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={value.chain === c}
                onClick={() => {
                  const newDex = c !== 'all' && value.dex !== 'all' && !dexesForChain(c).some((d) => d.id === value.dex) ? 'all' : value.dex
                  onChange({ ...value, chain: c, dex: newDex })
                }}
                className={cn('whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition-colors', value.chain === c ? 'bg-white/[0.09] text-fg' : 'text-muted hover:text-fg')}
              >
                {c === 'all' ? 'All' : NETWORKS[c].name}
              </button>
            ))}
          </div>
        )}

        {/* Dynamic DEX Quick Filter */}
        {show('dex') && (
          <select
            className="input h-9 w-auto py-1 pl-2.5 pr-7 text-xs font-medium"
            value={value.dex}
            onChange={(e) => set('dex', e.target.value)}
            aria-label="Filter by DEX"
          >
            <option value="all">All DEXes</option>
            {availableDexes.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {/* Quick Age Filter */}
        {show('maxAgeHours') && (
          <select
            className="input h-9 w-auto py-1 pl-2.5 pr-7 text-xs font-medium"
            value={value.maxAgeHours}
            onChange={(e) => set('maxAgeHours', Number(e.target.value))}
            aria-label="Filter by Age"
          >
            {AGE_OPTIONS.map((a) => (
              <option key={a.v} value={a.v}>{a.l}</option>
            ))}
          </select>
        )}

        {/* Quick Liquidity Filter */}
        {show('minLiquidity') && (
          <select
            className="input h-9 w-auto py-1 pl-2.5 pr-7 text-xs font-medium"
            value={value.minLiquidity}
            onChange={(e) => set('minLiquidity', Number(e.target.value))}
            aria-label="Filter by Liquidity"
          >
            {LIQ_OPTIONS.map((l) => (
              <option key={l.v} value={l.v}>{l.l}</option>
            ))}
          </select>
        )}

        {/* Quick Volume Filter */}
        {show('minVolume') && (
          <div className="flex items-center rounded-xl border border-line bg-bg-2">
            <select
              className="border-none bg-transparent py-1 pl-2.5 pr-6 text-xs font-medium text-fg focus:outline-none"
              value={value.minVolume}
              onChange={(e) => set('minVolume', Number(e.target.value))}
              aria-label="Filter by Volume"
            >
              {VOL_OPTIONS.map((v) => (
                <option key={v.v} value={v.v}>{v.l}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => set('volumeTimeframe', value.volumeTimeframe === 'h1' ? 'h24' : 'h1')}
              className="border-l border-line px-2 py-1.5 text-[10px] font-semibold uppercase text-muted hover:text-fg"
              title="Toggle volume timeframe between 1h and 24h"
            >
              {value.volumeTimeframe === 'h1' ? '1H' : '24H'}
            </button>
          </div>
        )}

        {/* Quick Market Cap Tier Filter */}
        {show('minMarketCap') && (
          <select
            className="input h-9 w-auto py-1 pl-2.5 pr-7 text-xs font-medium"
            value={value.marketCapTier}
            onChange={(e) => set('marketCapTier', e.target.value as MarketCapTier)}
            aria-label="Filter by Market Cap"
          >
            {MCAP_TIERS.map((t) => (
              <option key={t.v} value={t.v}>{t.l}</option>
            ))}
          </select>
        )}

        <Button size="sm" variant={active > 0 ? 'outline' : 'secondary'} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="filter-panel" className="h-9">
          <SlidersHorizontal className="h-3.5 w-3.5" /> More {active > 0 && <span className="num rounded bg-primary px-1.5 text-[10px] text-white">{active}</span>}
        </Button>

        {active > 0 && (
          <button type="button" onClick={() => onChange({ ...DEFAULT_FILTERS, query: value.query })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {open && (
        <div id="filter-panel" className="grid animate-rise grid-cols-2 gap-3 rounded-2xl border border-line bg-bg-2/60 p-3 sm:grid-cols-3 lg:grid-cols-4">
          {show('changeDirection') && (
            <label className="space-y-1">
              <span className="label block">24h change</span>
              <select className="input py-2" value={`${value.changeDirection}:${value.minChange}`} onChange={(e) => { const [d, m] = e.target.value.split(':'); onChange({ ...value, changeDirection: (d as MarketFilters['changeDirection']) ?? 'any', minChange: Number(m) || 0 }) }}>
                <option value="any:0">Any change</option>
                <option value="up:0">Gaining</option>
                <option value="up:10">Up 10%+</option>
                <option value="up:50">Up 50%+</option>
                <option value="down:0">Falling</option>
                <option value="down:10">Down 10%+</option>
              </select>
            </label>
          )}

          {show('status') && (
            <label className="space-y-1">
              <span className="label block">Status</span>
              <select className="input py-2" value={value.status} onChange={(e) => set('status', e.target.value as MarketFilters['status'])}>
                <option value="all">All statuses</option>
                <option value="bonding">On curve</option>
                <option value="migrated">Graduated</option>
                <option value="listed">DEX listed</option>
              </select>
            </label>
          )}

          {show('verifiedOnly') && (
            <label className="flex items-end gap-2 pb-2 text-sm text-muted">
              <input type="checkbox" checked={value.verifiedOnly} onChange={(e) => set('verifiedOnly', e.target.checked)} className="h-4 w-4 accent-[#3B82F6]" />
              Verified contract only
            </label>
          )}
        </div>
      )}
    </div>
  )
}
