
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber, cn } from '../lib/utils'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">
          {info.getValue()?.[0]}
        </div>
        <div>
          <div className="font-bold flex items-center gap-1">
            {info.getValue()}
            <span className="text-[10px] bg-secondary px-1 rounded text-muted-foreground uppercase">
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
    cell: info => <span className="font-mono">{formatCurrency(parseFloat(info.getValue()))}</span>,
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => <span className="font-medium">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => <span className="text-muted-foreground">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells (24h)',
    cell: info => {
      const buys = info.getValue()?.buys || 0
      const sells = info.getValue()?.sells || 0
      const total = buys + sells
      const buyRatio = total > 0 ? (buys / total) * 100 : 0

      return (
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{buys}B</span>
            <span className="text-red-500">{sells}S</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500"
              style={{ width: `${buyRatio}%` }}
            />
          </div>
        </div>
      )
    },
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return 'N/A'
      const ageHours = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return (
        <span className="text-xs font-medium">
          {ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`}
        </span>
      )
    },
  }),
  columnHelper.accessor('trendingScore', {
    header: 'Trend',
    cell: info => {
      const score = info.getValue() || 0
      return (
        <div className={cn(
          "px-2 py-1 rounded text-xs font-bold inline-block",
          score > 70 ? "bg-green-500/10 text-green-500" :
          score > 30 ? "bg-yellow-500/10 text-yellow-500" :
          "bg-muted text-muted-foreground"
        )}>
          {score > 70 ? '🔥 Hot' : score > 30 ? '📈 Rising' : '❄️ Cold'}
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
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground bg-card/50">
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
                <td key={cell.id} className="px-4 py-4 text-sm whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
               <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground italic">
                  No pairs found matching your filters.
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
