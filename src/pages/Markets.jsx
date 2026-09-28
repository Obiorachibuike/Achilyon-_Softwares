import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, SearchX } from 'lucide-react'
import useMarketStore from '../store/useMarketStore'
import { dexService } from '../services/api'
import { dedupePairs, filterPairs } from '../lib/market'
import { AGE_OPTIONS, CHAINS, LIQUIDITY_OPTIONS } from '../config'
import { timeAgo } from '../lib/utils'
import useDebounce from '../hooks/useDebounce'
import FiltersBar from '../components/FiltersBar'
import MarketTable from '../components/MarketTable'
import { Button, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui'

const SORTABLE = ['token', 'price', 'change1h', 'change24h', 'volume', 'liquidity', 'mcap', 'txns', 'age', 'score']
const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

export default function Markets() {
  const [params, setParams] = useSearchParams()
  const { pairs, status, error, fetchMarket, lastUpdated } = useMarketStore()
  const [remote, setRemote] = useState({ q: '', pairs: [], loading: false })

  const filters = {
    query: params.get('q') ?? '',
    chain: pick(params.get('chain'), CHAINS.map((c) => c.id), 'all'),
    age: pick(params.get('age'), AGE_OPTIONS.map((a) => a.id), 'any'),
    liquidity: pick(params.get('liq'), LIQUIDITY_OPTIONS.map((l) => l.id), 'any'),
  }
  const sortId = pick(params.get('sort'), SORTABLE, 'volume')
  const sortDir = params.get('dir') === 'asc' ? 'asc' : sortId === 'age' && !params.get('dir') ? 'asc' : 'desc'
  const sorting = [{ id: sortId, desc: sortDir === 'desc' }]

  const update = (patch) => {
    const next = new URLSearchParams(params)
    const map = { query: 'q', chain: 'chain', age: 'age', liquidity: 'liq' }
    Object.entries(patch).forEach(([k, v]) => {
      const key = map[k] ?? k
      if (!v || v === 'all' || v === 'any') next.delete(key)
      else next.set(key, v)
    })
    setParams(next, { replace: true })
  }

  const onSortingChange = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const s = next[0]
    const p = new URLSearchParams(params)
    if (!s) { p.delete('sort'); p.delete('dir') } else { p.set('sort', s.id); p.set('dir', s.desc ? 'desc' : 'asc') }
    setParams(p, { replace: true })
  }

  // Query DexScreener directly so search isn't limited to the preloaded universe.
  const debouncedQuery = useDebounce(filters.query.trim(), 400)
  useEffect(() => {
    if (debouncedQuery.length < 2) { setRemote({ q: '', pairs: [], loading: false }); return undefined }
    let cancelled = false
    setRemote((r) => ({ ...r, loading: true }))
    dexService.search(debouncedQuery)
      .then((res) => { if (!cancelled) setRemote({ q: debouncedQuery, pairs: res, loading: false }) })
      .catch(() => { if (!cancelled) setRemote({ q: debouncedQuery, pairs: [], loading: false }) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  const universe = useMemo(
    () => (remote.q && remote.q === debouncedQuery ? dedupePairs(pairs, remote.pairs) : pairs),
    [pairs, remote, debouncedQuery],
  )
  const rows = useMemo(() => filterPairs(universe, filters), [universe, filters.query, filters.chain, filters.age, filters.liquidity]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <PageHeader
        title="Markets"
        description="Search, filter and sort live DEX pairs. Filters and sorting are saved in the URL, so you can share or bookmark any view."
        actions={
          <Button onClick={() => fetchMarket()} loading={status === 'loading'}>
            {status !== 'loading' && <RefreshCw size={15} />} Refresh
            {lastUpdated && <span className="text-xs text-muted-foreground">· {timeAgo(lastUpdated)}</span>}
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <FiltersBar filters={filters} onChange={update} resultCount={rows.length} searching={remote.loading} />
        {status === 'loading' && !pairs.length ? (
          <Spinner label="Loading markets…" />
        ) : status === 'error' && !pairs.length ? (
          <ErrorState message={error} onRetry={() => fetchMarket()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No pairs match these filters"
            description={filters.query ? `Nothing found for “${filters.query}”. Try a token symbol or a contract address.` : 'Try widening the age or liquidity filter.'}
            action={<Button onClick={() => update({ query: '', chain: 'all', age: 'any', liquidity: 'any' })}>Reset filters</Button>}
          />
        ) : (
          <MarketTable key={`${filters.chain}-${filters.age}-${filters.liquidity}-${filters.query}`} data={rows} sorting={sorting} onSortingChange={onSortingChange} />
        )}
      </Card>
    </div>
  )
}
