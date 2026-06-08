
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
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold border border-primary/20">
          {info.getValue()?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{info.getValue()}</span>
            <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-bold uppercase border border-border">
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
    cell: info => formatCurrency(parseFloat(info.getValue())),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP (FDV)',
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
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const txns = info.getValue() || { buys: 0, sells: 0 }
      const total = txns.buys + txns.sells
      const buyPercent = total > 0 ? (txns.buys / total) * 100 : 50
      return (
        <div className="w-32">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-green-500">{txns.buys} B</span>
            <span className="text-red-500">{txns.sells} S</span>
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
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return 'N/A'
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`
    },
  }),
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      return (
        <div className={cn(
          "inline-flex items-center px-2 py-1 rounded text-xs font-bold",
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
      <table className="w-full text-left border-collapse">
        <thead className="bg-muted text-muted-foreground uppercase text-xs">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-3 font-medium">
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
            <tr key={row.id} className="hover:bg-muted/50 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-4 text-sm">
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
