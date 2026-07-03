
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
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold border border-primary/30">
          {info.getValue()?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-bold flex items-center gap-2">
            {info.getValue()}
            <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase font-medium">
              {info.row.original.chainId}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">{info.row.original.baseToken.name}</div>
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
    cell: info => `$${formatCompactNumber(info.getValue())}`,
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => `$${formatCompactNumber(info.getValue())}`,
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => `$${formatCompactNumber(info.getValue())}`,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return 'N/A'
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`
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
        <div className="w-32">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-green-500 font-bold">{buys} B</span>
            <span className="text-red-500 font-bold">{sells} S</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/30 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500"
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
          "font-bold text-center py-1 px-2 rounded",
          score > 70 ? "text-green-500 bg-green-500/10" :
          score > 40 ? "text-yellow-500 bg-yellow-500/10" :
          "text-muted-foreground bg-muted"
        )}>
          {score}
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
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted text-muted-foreground uppercase text-[10px] sticky top-0 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4 font-bold tracking-wider border-b border-border">
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
            <tr key={row.id} className="hover:bg-muted/30 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 text-sm group-hover:border-primary/20">
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
