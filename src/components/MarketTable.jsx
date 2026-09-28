import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Flame } from 'lucide-react'
import { metrics, pairKey } from '../lib/market'
import { formatAge, formatPrice, formatUsdCompact, cn } from '../lib/utils'
import { PriceChange, TokenCell, WatchButton } from './ui'

const num = (getter) => (row) => getter(metrics(row))

const allColumns = [
  { id: 'watch', header: '', enableSorting: false, size: 36, cell: ({ row }) => <WatchButton pair={row.original} /> },
  {
    id: 'token',
    header: 'Token',
    accessorFn: (row) => row.baseToken?.symbol?.toLowerCase() ?? '',
    cell: ({ row }) => <TokenCell pair={row.original} />,
    sortDescFirst: false,
  },
  { id: 'price', header: 'Price', accessorFn: num((m) => m.price ?? 0), cell: ({ row }) => <span className="tabular-nums">{formatPrice(row.original.priceUsd)}</span> },
  { id: 'change1h', header: '1h', accessorFn: num((m) => m.change1h), cell: ({ getValue }) => <PriceChange value={getValue()} /> },
  { id: 'change24h', header: '24h', accessorFn: num((m) => m.change24h), cell: ({ getValue }) => <PriceChange value={getValue()} /> },
  { id: 'volume', header: 'Volume 24h', accessorFn: num((m) => m.volume24h), cell: ({ getValue }) => <span className="tabular-nums">{formatUsdCompact(getValue())}</span> },
  { id: 'liquidity', header: 'Liquidity', accessorFn: num((m) => m.liquidity), cell: ({ getValue }) => <span className="tabular-nums">{formatUsdCompact(getValue())}</span> },
  { id: 'mcap', header: 'Mkt cap', accessorFn: num((m) => m.marketCap), cell: ({ getValue }) => <span className="tabular-nums">{formatUsdCompact(getValue())}</span> },
  {
    id: 'txns',
    header: 'Txns 24h',
    accessorFn: num((m) => m.buys24h + m.sells24h),
    cell: ({ row }) => {
      const m = metrics(row.original)
      const total = m.buys24h + m.sells24h
      return (
        <div className="min-w-[5.5rem]">
          <div className="tabular-nums">{total.toLocaleString()}</div>
          <div className="mt-1 flex h-1 overflow-hidden rounded-full bg-red-500/40">
            <div className="bg-emerald-500" style={{ width: `${total ? (m.buys24h / total) * 100 : 50}%` }} />
          </div>
        </div>
      )
    },
  },
  { id: 'age', header: 'Age', accessorFn: (row) => (row.pairCreatedAt ? -row.pairCreatedAt : Number.NEGATIVE_INFINITY), cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{formatAge(row.original.pairCreatedAt)}</span> },
  {
    id: 'score',
    header: () => <span className="inline-flex items-center gap-1"><Flame size={12} />Score</span>,
    accessorFn: num((m) => m.score),
    cell: ({ getValue }) => <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary">{getValue()}</span>,
  },
]

/**
 * Sortable market table. Controlled sorting is optional: pass `sorting` + `onSortingChange`
 * to persist sort state (e.g. in the URL).
 */
export default function MarketTable({ data, sorting: controlledSorting, onSortingChange, compact = false, pageSize = 50 }) {
  const navigate = useNavigate()
  const [localSorting, setLocalSorting] = useState([{ id: 'volume', desc: true }])
  const [limit, setLimit] = useState(pageSize)
  const sorting = controlledSorting ?? localSorting
  const columns = useMemo(
    () => (compact ? allColumns.filter((c) => ['watch', 'token', 'price', 'change24h', 'volume', 'liquidity', 'score'].includes(c.id)) : allColumns),
    [compact],
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: onSortingChange ?? setLocalSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => pairKey(row),
    sortDescFirst: true,
  })

  const rows = table.getRowModel().rows
  const visible = rows.slice(0, limit)

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort()
                  const dir = header.column.getIsSorted()
                  return (
                    <th key={header.id} className={cn('whitespace-nowrap px-3 py-3 font-medium first:pl-4', header.id !== 'token' && header.id !== 'watch' && 'text-right')} aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                      {sortable ? (
                        <button type="button" onClick={header.column.getToggleSortingHandler()} className={cn('inline-flex items-center gap-1 hover:text-foreground', dir && 'text-foreground')}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {dir === 'asc' ? <ArrowUp size={12} /> : dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-40" />}
                        </button>
                      ) : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                onClick={() => navigate(`/token/${row.original.chainId}/${row.original.pairAddress}`)}
                className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cn('whitespace-nowrap px-3 py-3 first:pl-4', cell.column.id !== 'token' && cell.column.id !== 'watch' && 'text-right')}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <div className="border-t border-border p-3 text-center">
          <button type="button" onClick={() => setLimit((l) => l + pageSize)} className="text-sm font-medium text-primary hover:underline">
            Show more ({rows.length - limit} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
