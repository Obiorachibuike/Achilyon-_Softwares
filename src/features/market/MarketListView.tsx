'use client'
import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import type { MarketList } from '@/lib/api/lists'
import { filtersFromParams, filtersToParams, type MarketFilters } from '@/lib/market/filters'
import { isChainId } from '@/lib/blockchain/chains'
import { useTokenList } from '@/hooks/useMarket'
import { usePreferences } from '@/stores/preferences'
import { useMounted } from '@/hooks/useMounted'
import { errorMessage } from '@/lib/api/client'
import type { SortDirection, SortKey } from '@/lib/market/sorting'
import { Card } from '@/components/ui/primitives'
import { DemoBadge } from '@/components/ui/feedback'
import { PageHeader } from '@/components/ui/primitives'
import { FilterBar } from './FilterBar'
import { TokenTable, type ColumnKey } from './TokenTable'

/**
 * Generic market list page: URL-synced filters + search, server-selected
 * list, client-side sorting and pagination. Used by Discover, New Tokens,
 * New Pairs, Gainers and Losers.
 */
export function MarketListView({ list, title, description, columns, initialSort = null, hideFilters = [], extra }: {
  list: MarketList
  title: string
  description: string
  columns?: ColumnKey[]
  initialSort?: { key: SortKey; dir: SortDirection } | null
  hideFilters?: (keyof MarketFilters)[]
  extra?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const mounted = useMounted()
  const network = usePreferences((s) => s.network)
  const [, startTransition] = useTransition()

  const filters = useMemo(() => {
    const f = filtersFromParams(new URLSearchParams(params.toString()), isChainId)
    if (!params.get('chain') && mounted && network !== 'all') f.chain = network
    return f
  }, [params, mounted, network])
  const [query, setQuery] = useState(filters.query)

  const apiParams = useMemo(() => {
    const p = filtersToParams(filters)
    p.set('pageSize', '200')
    return p.toString()
  }, [filters])

  const { data, isLoading, error, refetch } = useTokenList(list, apiParams)

  const update = (f: MarketFilters) => {
    const p = filtersToParams(f)
    startTransition(() => router.replace(`${pathname}${p.size ? `?${p}` : ''}`, { scroll: false }))
  }

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} eyebrow={data?.demo ? <DemoBadge /> : undefined} actions={extra} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <FilterBar value={filters} onChange={update} hide={hideFilters} />
        <form role="search" onSubmit={(e) => { e.preventDefault(); update({ ...filters, query }) }} className="relative lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (!e.target.value) update({ ...filters, query: '' }) }}
            onBlur={() => query !== filters.query && update({ ...filters, query })}
            placeholder="Filter by name, ticker, address…"
            aria-label="Filter tokens"
            className="input h-9 py-0 pl-9"
            maxLength={80}
          />
        </form>
      </div>
      <Card className="overflow-hidden">
        <TokenTable
          key={apiParams}
          caption={title}
          tokens={data?.items}
          loading={isLoading}
          error={error ? errorMessage(error) : null}
          onRetry={() => void refetch()}
          columns={columns}
          initialSort={initialSort}
        />
      </Card>
      {data && <p className="num text-xs text-subtle">{data.total.toLocaleString()} markets{data.demo ? ' · simulated demo data' : ' · live data from DexScreener'}</p>}
    </div>
  )
}
