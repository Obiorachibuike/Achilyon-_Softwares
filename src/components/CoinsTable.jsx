
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
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-bold">
              {info.row.original.chainId}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate max-w-[120px]">
            {info.row.original.baseToken.name}
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
      <span className="font-mono">{formatCurrency(parseFloat(info.getValue()))}</span>
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
      <div className="font-medium text-blue-400">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => (
      <div className="font-medium">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return <span className="text-muted-foreground">-</span>;
      const ageMs = Date.now() - info.getValue()
      const ageHours = ageMs / 1000 / 60 / 60
      if (ageHours < 1) return <span className="text-yellow-500 font-bold">NEW</span>
      return ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`
    },
  }),
  columnHelper.display({
    id: 'buysSells',
    header: 'Buys/Sells (24h)',
    cell: info => {
      const buys = info.row.original.txns?.h24?.buys || 0
      const sells = info.row.original.txns?.h24?.sells || 0
      const total = buys + sells || 1
      const buyPercent = (buys / total) * 100

      return (
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{buys} B</span>
            <span className="text-red-500">{sells} S</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/30 rounded-full overflow-hidden flex">
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
        <div className="flex items-center gap-2">
           <div className={
             `text-xs font-bold px-2 py-1 rounded ${
               score > 70 ? 'bg-orange-500/20 text-orange-500' :
               score > 40 ? 'bg-yellow-500/20 text-yellow-500' :
               'bg-blue-500/20 text-blue-500'
             }`
           }>
             {score}
           </div>
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
    <div className="w-full">
      <table className="w-full text-left border-collapse">
        <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-md">
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
        <tbody className="divide-y divide-border/50">
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-primary/5 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground italic">
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
