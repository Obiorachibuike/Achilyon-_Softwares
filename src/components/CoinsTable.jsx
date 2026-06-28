
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber, cn } from '../lib/utils'
import { calculateTrendingScore } from '../lib/trending'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20 shrink-0">
          {info.getValue()?.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{info.getValue()}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono uppercase">
              {info.row.original.chainId}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            {info.row.original.baseToken.name}
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => <span className="font-mono">{formatCurrency(parseFloat(info.getValue()))}</span>,
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => <span className="font-mono">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => <span className="font-mono">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => <span className="font-mono text-primary">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      const ts = info.getValue()
      if (!ts) return '-'
      const age = (Date.now() - ts) / 1000 / 60 / 60
      return <span className="text-muted-foreground">{age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`}</span>
    },
  }),
  columnHelper.display({
    id: 'txns',
    header: 'Buys/Sells (24h)',
    cell: info => {
      const txns = info.row.original.txns?.h24 || { buys: 0, sells: 0 }
      const total = (txns.buys + txns.sells) || 1
      const buyPercent = (txns.buys / total) * 100
      return (
        <div className="space-y-1 min-w-[100px]">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{txns.buys}</span>
            <span className="text-red-500">{txns.sells}</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500" style={{ width: `${buyPercent}%` }}></div>
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
          "font-bold text-center px-2 py-1 rounded text-xs",
          score > 70 ? "bg-green-500/10 text-green-500" :
          score > 40 ? "bg-yellow-500/10 text-yellow-500" :
          "bg-muted text-muted-foreground"
        )}>
          {score}
        </div>
      )
    }
  }),
]

const CoinsTable = ({ data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic">
        <p>No pairs found matching your filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-4 border-b border-border">
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
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-primary/5 transition-colors group cursor-pointer">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3.5 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

CoinsTable.propTypes = {
  data: PropTypes.array.isRequired,
}

export default CoinsTable
