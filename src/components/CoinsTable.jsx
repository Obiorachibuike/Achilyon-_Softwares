import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber } from '../lib/utils'
import { calculateTrendScore } from '../lib/trending'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold border border-primary/30">
          {info.getValue()?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-bold flex items-center gap-1">
            {info.getValue()}
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase">
              {info.row.original.chainId}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">
            {info.row.original.baseToken.name}
          </div>
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
      <div className="font-medium text-muted-foreground">
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
      if (!info.getValue()) return '-'
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return (
        <div className="text-xs text-muted-foreground">
          {age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`}
        </div>
      )
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const txns = info.getValue() || { buys: 0, sells: 0 }
      const total = txns.buys + txns.sells
      const buyPercent = total === 0 ? 50 : (txns.buys / total) * 100
      return (
        <div className="w-24 space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{txns.buys}</span>
            <span className="text-red-500">{txns.sells}</span>
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden flex">
            <div className="h-full bg-green-500" style={{ width: `${buyPercent}%` }} />
            <div className="h-full bg-red-500" style={{ width: `${100 - buyPercent}%` }} />
          </div>
        </div>
      )
    },
  }),
  columnHelper.accessor(row => calculateTrendScore(row), {
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = info.getValue()
      let color = 'text-gray-400'
      if (score > 80) color = 'text-orange-500'
      else if (score > 60) color = 'text-yellow-500'
      else if (score > 40) color = 'text-blue-500'
      else if (score > 20) color = 'text-green-500'

      return (
        <div className={`font-bold ${color} flex items-center gap-1`}>
          {score}
          <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
        </div>
      )
    },
  }),
]

const CoinsTable = ({ data }) => {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-separate border-spacing-0">
        <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] sticky top-0 z-10 backdrop-blur-md">
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
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-primary/5 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-sm whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
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
