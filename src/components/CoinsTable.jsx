import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber } from '../lib/utils'
import { calculateTrendingScore } from '../lib/trending'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">
          {info.getValue()?.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{info.getValue()}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono uppercase">
              {info.row.original.chainId}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{info.row.original.quoteToken.symbol}</div>
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
      <div className="font-medium">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
      <div className="font-medium">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => (
      <div className="font-medium text-primary">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return <span className="text-muted-foreground">-</span>
      const ageMs = Date.now() - info.getValue()
      const ageHours = ageMs / 1000 / 60 / 60
      if (ageHours < 1) return <span className="text-yellow-500 font-bold">{(ageHours * 60).toFixed(0)}m</span>
      return ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const buys = info.getValue()?.buys || 0
      const sells = info.getValue()?.sells || 0
      const total = buys + sells
      const buyPercent = total > 0 ? (buys / total) * 100 : 50

      return (
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{buys}</span>
            <span className="text-red-500">{sells}</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500" style={{ width: `${buyPercent}%` }}></div>
            <div className="h-full bg-red-500" style={{ width: `${100 - buyPercent}%` }}></div>
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
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
             <div
               className="h-full bg-gradient-to-r from-blue-500 to-primary"
               style={{ width: `${Math.min(score, 100)}%` }}
             ></div>
          </div>
          <span className="text-xs font-bold">{score}</span>
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

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4 font-bold">
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
              <tr key={row.id} className="hover:bg-primary/5 transition-colors group cursor-pointer">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground italic">
                No tokens found matching the current filters.
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
