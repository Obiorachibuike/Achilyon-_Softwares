
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
      <div className="flex items-center">
        <div className="font-bold">{info.getValue()}</div>
        <span className="ml-2 text-xs text-muted-foreground">{info.row.original.quoteToken?.symbol}</span>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => formatCurrency(parseFloat(info.getValue())),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => `$${formatCompactNumber(info.getValue() || 0)}`,
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => `$${formatCompactNumber(info.getValue() || 0)}`,
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => `$${formatCompactNumber(info.getValue() || 0)}`,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return 'Unknown'
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const txns = info.getValue() || { buys: 0, sells: 0 }
      return (
        <div className="flex gap-1 text-xs">
          <span className="text-green-500">{txns.buys}B</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-red-500">{txns.sells}S</span>
        </div>
      )
    }
  }),
  columnHelper.display({
    id: 'trending',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      return (
        <div className={cn(
          "px-2 py-1 rounded text-xs font-bold w-fit",
          score > 70 ? "bg-green-500/20 text-green-500" :
          score > 30 ? "bg-yellow-500/20 text-yellow-500" : "bg-muted text-muted-foreground"
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
            <tr key={row.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-4 text-sm whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="px-4 py-8 text-center text-muted-foreground italic">
                No pairs found matching the criteria.
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
