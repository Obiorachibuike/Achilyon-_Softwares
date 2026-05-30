
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
      <div className="flex items-center">
        <div className="font-bold">{info.getValue()}</div>
        <span className="ml-2 text-xs text-muted-foreground uppercase">{info.row.original.chainId}</span>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => formatCurrency(parseFloat(info.getValue() || 0)),
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
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells (24h)',
    cell: info => {
      const { buys = 0, sells = 0 } = info.getValue() || {}
      return (
        <div className="flex items-center gap-1">
          <span className="text-green-500 font-medium">{buys}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-red-500 font-medium">{sells}</span>
        </div>
      )
    },
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return '-'
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`
    },
  }),
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      let color = 'text-muted-foreground'
      if (score > 50) color = 'text-green-500'
      if (score > 100) color = 'text-primary'

      return (
        <div className={`font-bold ${color}`}>
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
        <thead className="bg-muted text-muted-foreground uppercase text-[10px] tracking-wider">
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
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/50 transition-colors group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
             <tr>
               <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
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
