
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber } from '../lib/utils'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">{info.getValue()}</span>
            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded uppercase font-bold text-muted-foreground">
              {info.row.original.chainId}
            </span>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            {info.row.original.baseToken.name}
          </span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
      <span className="font-mono text-sm">
        {formatCurrency(parseFloat(info.getValue()))}
      </span>
    ),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => (
      <span className="font-medium">
        ${formatCompactNumber(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
      <span className="text-muted-foreground">
        ${formatCompactNumber(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => (
      <span className="font-medium text-foreground">
        ${formatCompactNumber(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return '-'
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return (
        <span className="text-xs text-muted-foreground">
          {age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`}
        </span>
      )
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
          <div className="flex justify-between text-[10px] font-bold uppercase">
            <span className="text-green-500">{buys} B</span>
            <span className="text-red-500">{sells} S</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${buyPercent}%` }}
            />
          </div>
        </div>
      )
    }
  }),
  columnHelper.accessor('trendingScore', {
    header: 'Trend',
    cell: info => {
      const score = info.getValue() || 0
      return (
        <div className="flex items-center gap-2">
           <div className={`text-sm font-bold ${score > 70 ? 'text-orange-500' : score > 40 ? 'text-blue-500' : 'text-muted-foreground'}`}>
             {score.toFixed(0)}
           </div>
           <div className="flex gap-0.5">
             {[1, 2, 3].map(i => (
               <div
                 key={i}
                 className={`w-1 h-3 rounded-full ${score > (i * 25) ? 'bg-primary' : 'bg-muted'}`}
               />
             ))}
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
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4 border-b border-border">
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
            <tr key={row.id} className="hover:bg-primary/[0.02] transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="py-20 text-center text-muted-foreground italic">
          No pairs found matching your filters.
        </div>
      )}
    </div>
  )
}

CoinsTable.propTypes = {
  data: PropTypes.array.isRequired,
}

export default CoinsTable
