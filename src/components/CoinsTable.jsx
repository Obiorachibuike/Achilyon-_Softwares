
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber, cn } from '../lib/utils'
import { ExternalLink, ShieldCheck } from 'lucide-react'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => {
      const pair = info.row.original
      const isVerified = pair.info?.websites?.length > 0 || pair.info?.socials?.length > 0

      return (
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground">{info.getValue()}</span>
              {isVerified && <ShieldCheck size={14} className="text-primary fill-primary/10" />}
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-bold uppercase tracking-tight">
                 {pair.chainId}
               </span>
               <span className="text-xs text-muted-foreground/60">{pair.quoteToken?.symbol}</span>
            </div>
          </div>
        </div>
      )
    },
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
      <div className="font-mono text-sm">
        {formatCurrency(parseFloat(info.getValue() || 0))}
      </div>
    ),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => (
      <div className="font-semibold">
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
      <div className="text-muted-foreground">
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => (
      <div className={cn(
        "font-medium",
        parseFloat(info.getValue() || 0) > 100000 ? "text-green-500" : "text-foreground"
      )}>
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return '-'
      const ageHours = (Date.now() - info.getValue()) / 1000 / 60 / 60
      if (ageHours < 1) return `${Math.round(ageHours * 60)}m`
      return ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const txns = info.getValue() || { buys: 0, sells: 0 }
      const total = txns.buys + txns.sells
      const buyPercent = total > 0 ? (txns.buys / total) * 100 : 50

      return (
        <div className="w-24 space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{txns.buys}</span>
            <span className="text-red-500">{txns.sells}</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
             <div
               className="h-full bg-green-500 transition-all duration-500"
               style={{ width: `${buyPercent}%` }}
             />
          </div>
        </div>
      )
    },
  }),
  columnHelper.accessor('trendingScore', {
    header: 'Trend',
    cell: info => {
      const score = info.getValue() || 0
      return (
        <div className={cn(
          "px-2 py-1 rounded text-xs font-bold text-center w-12",
          score > 80 ? "bg-blue-500/20 text-blue-500" :
          score > 50 ? "bg-green-500/20 text-green-500" :
          "bg-secondary text-muted-foreground"
        )}>
          {score}
        </div>
      )
    },
  }),
  columnHelper.display({
    id: 'actions',
    cell: info => (
      <a
        href={info.row.original.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        <ExternalLink size={16} />
      </a>
    )
  })
]

const CoinsTable = ({ data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-widest font-bold">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-4 font-bold border-b border-border">
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
        <tbody className="divide-y divide-border/50">
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-primary/5 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-4 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground italic">
                No tokens found matching your filters.
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
