import { Search, X, SlidersHorizontal } from 'lucide-react'
import { AGE_OPTIONS, CHAINS, LIQUIDITY_OPTIONS } from '../config'
import { cn } from '../lib/utils'
import { inputClass } from './ui'

const selectClass = cn(inputClass, 'w-auto min-w-[8.5rem] cursor-pointer pr-8')

/** Controlled filter bar: `filters` = { query, chain, age, liquidity }. */
export default function FiltersBar({ filters, onChange, resultCount, searching }) {
  const active = filters.chain !== 'all' || filters.age !== 'any' || filters.liquidity !== 'any' || filters.query
  return (
    <div className="flex flex-col gap-3 border-b border-border p-3 sm:p-4 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={filters.query}
          onChange={(e) => onChange({ query: e.target.value })}
          placeholder="Search symbol, name, token or pair address…"
          className={cn(inputClass, 'pl-9')}
          aria-label="Search markets"
        />
        {searching && <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal size={16} className="hidden text-muted-foreground sm:block" />
        <select aria-label="Chain" className={selectClass} value={filters.chain} onChange={(e) => onChange({ chain: e.target.value })}>
          <option value="all">All chains</option>
          {CHAINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select aria-label="Pair age" className={selectClass} value={filters.age} onChange={(e) => onChange({ age: e.target.value })}>
          {AGE_OPTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <select aria-label="Minimum liquidity" className={selectClass} value={filters.liquidity} onChange={(e) => onChange({ liquidity: e.target.value })}>
          {LIQUIDITY_OPTIONS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        {active && (
          <button type="button" onClick={() => onChange({ query: '', chain: 'all', age: 'any', liquidity: 'any' })} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:text-foreground">
            <X size={14} /> Reset
          </button>
        )}
        {typeof resultCount === 'number' && <span className="ml-auto text-xs text-muted-foreground lg:ml-2">{resultCount.toLocaleString()} pairs</span>}
      </div>
    </div>
  )
}
