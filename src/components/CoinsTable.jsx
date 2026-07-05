
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
      <div className="flex items-center gap-3 min-w-[140px]">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs text-primary border border-primary/20">
          {info.getValue()?.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{info.getValue()}</span>
            <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase text-muted-foreground border border-border">
              {info.row.original.chainId}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[100px]">
            {info.row.original.baseToken.name}
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
        <span className="font-medium text-foreground">
            {formatCurrency(parseFloat(info.getValue()))}
        </span>
    ),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => (
        <span className="text-foreground/90">
            ${formatCompactNumber(info.getValue())}
        </span>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
        <div className="flex flex-col">
            <span className="text-foreground/90">${formatCompactNumber(info.getValue())}</span>
            <span className="text-[10px] text-muted-foreground uppercase">{info.row.original.dexId}</span>
        </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume',
    cell: info => (
        <div className="flex flex-col">
            <span className="text-foreground/90">${formatCompactNumber(info.getValue())}</span>
            <div className="flex gap-1 mt-1">
                <span className={cn("text-[10px]", parseFloat(info.row.original.priceChange?.h24 || 0) >= 0 ? "text-green-500" : "text-red-500")}>
                    {parseFloat(info.row.original.priceChange?.h24 || 0) > 0 ? '+' : ''}{info.row.original.priceChange?.h24}%
                </span>
            </div>
        </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return '-'
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return (
        <span className="text-muted-foreground font-mono text-xs">
            {age < 1 ? `${(age * 60).toFixed(0)}m` : age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`}
        </span>
      )
    },
  }),
  columnHelper.display({
    id: 'buysSells',
    header: 'Buys/Sells',
    cell: info => {
        const buys = parseInt(info.row.original.txns?.h24?.buys || 0)
        const sells = parseInt(info.row.original.txns?.h24?.sells || 0)
        const total = buys + sells
        const buyPercent = total > 0 ? (buys / total) * 100 : 50

        return (
            <div className="w-24">
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span className="text-green-500">{buys}</span>
                    <span className="text-red-500">{sells}</span>
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
            <div className="flex items-center gap-2">
                <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    score > 100 ? "bg-orange-500" : score > 50 ? "bg-green-500" : "bg-blue-500"
                )}></div>
                <span className="font-bold text-foreground">{score}</span>
            </div>
        )
    }
  })
]

const CoinsTable = ({ data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-md">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-3 font-bold border-b border-border">
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
            <tr key={row.id} className="hover:bg-muted/30 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-4 text-sm whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="py-20 text-center text-muted-foreground italic">
            No pairs found matching the current filters...
        </div>
      )}
    </div>
  )
}

CoinsTable.propTypes = {
  data: PropTypes.array.isRequired,
}

export default CoinsTable
