
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber, cn, getDisplayChainName } from '../lib/utils'
import { calculateTrendingScore } from '../lib/trending'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => {
      const pair = info.row.original
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {pair.baseToken.symbol[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{pair.baseToken.symbol}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase">
                {getDisplayChainName(pair.chainId)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate max-w-[120px]">
              {pair.baseToken.name}
            </div>
          </div>
        </div>
      )
    },
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
    cell: info => <span className="font-medium text-muted-foreground">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => <span className="font-medium">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return '-'
      const ageInMs = Date.now() - info.getValue()
      const ageInHours = ageInMs / 1000 / 60 / 60
      if (ageInHours < 1) return `${Math.floor(ageInHours * 60)}m`
      return ageInHours < 24 ? `${ageInHours.toFixed(1)}h` : `${(ageInHours / 24).toFixed(1)}d`
    },
  }),
  columnHelper.display({
    id: 'buysSells',
    header: 'Buys/Sells (1h)',
    cell: info => {
      const txns = info.row.original.txns?.h1 || { buys: 0, sells: 0 }
      const total = txns.buys + txns.sells
      const buyPercent = total > 0 ? (txns.buys / total) * 100 : 50

      return (
        <div className="w-32">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-green-500 font-bold">{txns.buys}B</span>
            <span className="text-red-500 font-bold">{txns.sells}S</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500"
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
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0">
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
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/30 transition-colors group">
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
