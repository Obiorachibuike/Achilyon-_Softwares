
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
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <div className="font-bold text-foreground">{info.getValue()}</div>
          <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase font-medium">
            {info.row.original.chainId}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
          {info.row.original.baseToken.name}
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
      <div className="font-mono text-xs">
        {formatCurrency(parseFloat(info.getValue()))}
      </div>
    ),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => (
      <div className="font-medium text-xs">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
      <div className="font-medium text-xs text-blue-400">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume',
    cell: info => (
      <div className="font-medium text-xs">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return <span className="text-muted-foreground italic">-</span>
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return (
        <div className="text-xs text-muted-foreground">
          {age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`}
        </div>
      )
    },
  }),
  columnHelper.display({
    id: 'txns',
    header: 'Buys/Sells',
    cell: info => {
      const buys = info.row.original.txns?.h24?.buys || 0
      const sells = info.row.original.txns?.h24?.sells || 0
      const total = buys + sells
      const buyPercent = total > 0 ? (buys / total) * 100 : 50

      return (
        <div className="w-24 space-y-1">
          <div className="flex justify-between text-[10px] font-medium">
            <span className="text-green-500">{buys}</span>
            <span className="text-red-500">{sells}</span>
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
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      return (
        <div className={cn(
          "font-bold text-xs px-2 py-1 rounded text-center min-w-[40px]",
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
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4 font-bold border-b border-border">
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
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/30 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground italic">
                No tokens found matching your filters...
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
