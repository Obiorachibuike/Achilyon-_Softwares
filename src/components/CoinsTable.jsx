
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { formatCurrency, formatCompactNumber, cn } from '../lib/utils'
import { calculateTrendingScore } from '../lib/trending'
import PropTypes from 'prop-types'
import { ArrowUpDown, ExternalLink } from 'lucide-react'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Token <ArrowUpDown size={12} />
      </button>
    ),
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{info.getValue()}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground uppercase">
              {info.row.original.chainId}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono truncate w-24">
            {info.row.original.baseToken.address.slice(0, 6)}...{info.row.original.baseToken.address.slice(-4)}
          </span>
        </div>
        <a
          href={info.row.original.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink size={14} />
        </a>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Price <ArrowUpDown size={12} />
      </button>
    ),
    cell: info => <span className="font-mono">{formatCurrency(parseFloat(info.getValue()))}</span>,
  }),
  columnHelper.accessor('fdv', {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        MCAP <ArrowUpDown size={12} />
      </button>
    ),
    cell: info => `$${formatCompactNumber(info.getValue())}`,
  }),
  columnHelper.accessor('liquidity.usd', {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Liquidity <ArrowUpDown size={12} />
      </button>
    ),
    cell: info => `$${formatCompactNumber(info.getValue())}`,
  }),
  columnHelper.accessor('volume.h24', {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Volume (24h) <ArrowUpDown size={12} />
      </button>
    ),
    cell: info => `$${formatCompactNumber(info.getValue())}`,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Age <ArrowUpDown size={12} />
      </button>
    ),
    cell: info => {
      if (!info.getValue()) return 'N/A'
      const ageHours = (Date.now() - info.getValue()) / 1000 / 60 / 60
      if (ageHours < 1) return `${(ageHours * 60).toFixed(0)}m`
      return ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`
    },
  }),
  columnHelper.display({
    id: 'txns',
    header: 'Buys/Sells (24h)',
    cell: info => {
      const buys = info.row.original.txns?.h24?.buys || 0
      const sells = info.row.original.txns?.h24?.sells || 0
      const total = buys + sells
      const buyPercent = total > 0 ? (buys / total) * 100 : 50

      return (
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-[10px] font-medium">
            <span className="text-green-500">{buys} B</span>
            <span className="text-red-500">{sells} S</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${buyPercent}%` }}
            />
          </div>
        </div>
      )
    }
  }),
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      return (
        <div className={cn(
          "px-2 py-1 rounded text-xs font-bold text-center",
          score > 50 ? "bg-green-500/10 text-green-500" :
          score > 20 ? "bg-yellow-500/10 text-yellow-500" :
          "bg-muted text-muted-foreground"
        )}>
          {score}
        </div>
      )
    }
  })
]

const CoinsTable = ({ data }) => {
  const [sorting, setSorting] = useState([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-3 font-semibold border-b border-border">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-primary/5 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-4 text-sm border-b border-border/50">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
             <tr>
               <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground italic">
                 No pairs found matching the current filters.
               </td>
             </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

CoinsTable.propTypes = {
  data: PropTypes.array.isRequired,
}

export default CoinsTable
