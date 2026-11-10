'use client'
import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { ChainId } from '@/types'
import { DEFAULT_FILTERS, countActiveFilters, type MarketFilters } from '@/lib/market/filters'
import { FILTER_CHAINS, NETWORKS } from '@/lib/blockchain/chains'
import { DEXES } from '@/lib/blockchain/dexes'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

const MCAP_OPTIONS = [
  { min: 0, max: 0, label: 'Any MCAP' },
  { min: 0, max: 1_000_000, label: 'Micro cap (<$1M)' },
  { min: 1_000_000, max: 10_000_000, label: 'Small cap ($1M–$10M)' },
  { min: 10_000_000, max: 100_000_000, label: 'Mid cap ($10M–$100M)' },
  { min: 100_000_000, max: 0, label: 'Large cap (>$100M)' },
]
const LIQ = [
  { v: 0, l: 'Any liquidity' },
  { v: 10_000, l: '> $10k' },
  { v: 100_000, l: '> $100k' },
  { v: 1_000_000, l: '> $1m' },
]
const VOL = [
  { v: 0, l: 'Any volume' },
  { v: 10_000, l: '> $10k' },
  { v: 100_000, l: '> $100k' },
  { v: 1_000_000, l: '> $1m' },
]
const AGE = [
  { v: 0, l: 'Any age' },
  { v: 1, l: '< 1h' },
  { v: 6, l: '< 6h' },
  { v: 24, l: '< 24h' },
  { v: 168, l: '< 7d' },
]

/**
 * Reusable market filter bar. Controlled by a `MarketFilters` value, so any
 * page can persist it (URL params, preferences, local state).
 */
export function FilterBar({ value, onChange, hide = [], className }: { value: MarketFilters; onChange: (f: MarketFilters) => void; hide?: (keyof MarketFilters)[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const active = countActiveFilters(value)
  const set = <K extends keyof MarketFilters>(k: K, v: MarketFilters[K]) => onChange({ ...value, [k]: v })
  const show = (k: keyof MarketFilters) => !hide.includes(k)

  const availableDexes = value.chain === 'all'
    ? DEXES
    : DEXES.filter((d) => d.chains.includes(value.chain as ChainId))

  const currentMcapIdx = MCAP_OPTIONS.findIndex(
    (o) => o.min === value.minMarketCap && o.max === value.maxMarketCap,
  )

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {show('chain') && (
          <div role="radiogroup" aria-label="Network" className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-bg-2 p-0.5 scrollbar-none">
            {(['all', ...FILTER_CHAINS] as (ChainId | 'all')[]).map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={value.chain === c}
                onClick={() => {
                  const chainDexes = c === 'all' ? DEXES : DEXES.filter((d) => d.chains.includes(c))
                  const dexValid = value.dex === 'all' || chainDexes.some((d) => d.id === value.dex)
                  onChange({ ...value, chain: c, dex: dexValid ? value.dex : 'all' })
                }}
                className={cn('whitespace-nowrap rounded-[10px] px-2.5 py-1.5 text-xs font-medium transition-colors', value.chain === c ? 'bg-white/[0.09] text-fg' : 'text-muted hover:text-fg')}
              >
                {c === 'all' ? 'All' : NETWORKS[c].name}
              </button>
            ))}
          </div>
        )}
        <Button size="sm" variant={active ? 'outline' : 'secondary'} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="filter-panel" className="h-9">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters {active > 0 && <span className="num rounded bg-primary px-1.5 text-[10px] text-white">{active}</span>}
        </Button>
        {active > 0 && (
          <button type="button" onClick={() => onChange({ ...DEFAULT_FILTERS, query: value.query })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>
      {open && (
        <div id="filter-panel" className="grid animate-rise grid-cols-2 gap-3 rounded-2xl border border-line bg-bg-2/60 p-3 sm:grid-cols-3 lg:grid-cols-6">
          {show('minMarketCap') && (
            <label className="space-y-1">
              <span className="label block">Market cap</span>
              <select
                className="input py-2"
                value={currentMcapIdx >= 0 ? currentMcapIdx : 0}
                onChange={(e) => {
                  const opt = MCAP_OPTIONS[Number(e.target.value)] ?? MCAP_OPTIONS[0]!
                  onChange({ ...value, minMarketCap: opt.min, maxMarketCap: opt.max })
                }}
              >
                {MCAP_OPTIONS.map((o, idx) => (
                  <option key={idx} value={idx}>{o.label}</option>
                ))}
              </select>
            </label>
          )}
          {show('minLiquidity') && <Select label="Liquidity" value={value.minLiquidity} onChange={(v) => set('minLiquidity', v)} options={LIQ} />}
          {show('minVolume') && <Select label="Volume (24h)" value={value.minVolume} onChange={(v) => set('minVolume', v)} options={VOL} />}
          {show('maxAgeHours') && <Select label="Age" value={value.maxAgeHours} onChange={(v) => set('maxAgeHours', v)} options={AGE} />}
          {show('changeDirection') && (
            <label className="space-y-1">
              <span className="label block">24h change</span>
              <select className="input py-2" value={`${value.changeDirection}:${value.minChange}`} onChange={(e) => { const [d, m] = e.target.value.split(':'); onChange({ ...value, changeDirection: (d as MarketFilters['changeDirection']) ?? 'any', minChange: Number(m) || 0 }) }}>
                <option value="any:0">Any</option>
                <option value="up:0">Gaining</option>
                <option value="up:10">Up 10%+</option>
                <option value="up:50">Up 50%+</option>
                <option value="down:0">Falling</option>
                <option value="down:10">Down 10%+</option>
              </select>
            </label>
          )}
          {show('dex') && (
            <label className="space-y-1">
              <span className="label block">DEX</span>
              <select className="input py-2" value={value.dex} onChange={(e) => set('dex', e.target.value)}>
                <option value="all">All DEXs</option>
                {availableDexes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          )}
          {show('status') && (
            <label className="space-y-1">
              <span className="label block">Status</span>
              <select className="input py-2" value={value.status} onChange={(e) => set('status', e.target.value as MarketFilters['status'])}>
                <option value="all">All</option>
                <option value="bonding">On curve</option>
                <option value="migrated">Graduated</option>
                <option value="listed">DEX listed</option>
              </select>
            </label>
          )}
          {show('verifiedOnly') && (
            <label className="flex items-end gap-2 pb-2 text-sm text-muted">
              <input type="checkbox" checked={value.verifiedOnly} onChange={(e) => set('verifiedOnly', e.target.checked)} className="h-4 w-4 accent-[#3B82F6]" />
              Verified only
            </label>
          )}
        </div>
      )}
    </div>
  )
}

function Select({ label, value, onChange, options }: { label: string; value: number; onChange: (v: number) => void; options: { v: number; l: string }[] }) {
  return (
    <label className="space-y-1">
      <span className="label block">{label}</span>
      <select className="input py-2" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}
