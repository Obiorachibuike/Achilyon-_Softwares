
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
        <div className="flex flex-col">
          <div className="font-bold flex items-center gap-2">
            {info.getValue()}
            <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded uppercase text-muted-foreground font-mono">
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
        <div className="font-mono">
            {formatCurrency(parseFloat(info.getValue()))}
        </div>
    ),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => (
        <div className="font-medium text-foreground">
            ${formatCompactNumber(info.getValue() || 0)}
        </div>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => `$${formatCompactNumber(info.getValue() || 0)}`,
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => (
        <div className="font-medium text-blue-500">
            ${formatCompactNumber(info.getValue() || 0)}
        </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return 'N/A';
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return (
        <div className="text-muted-foreground text-xs">
            {age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`}
        </div>
      )
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells (24h)',
    cell: info => {
        const buys = info.getValue()?.buys || 0;
        const sells = info.getValue()?.sells || 0;
        const total = buys + sells;
        const buyPercent = total > 0 ? (buys / total) * 100 : 50;

        return (
            <div className="w-32">
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                    <span className="text-green-500">{buys}</span>
                    <span className="text-red-500">{sells}</span>
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
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
        const score = calculateTrendingScore(info.row.original);
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
    <div className="w-full overflow-x-auto min-h-[400px]">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-secondary/50 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border sticky top-0 backdrop-blur-md">
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
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-primary/5 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground italic">
            No results found matching your filters.
        </div>
      )}
    </div>
  )
}

CoinsTable.propTypes = {
  data: PropTypes.array.isRequired,
}

export default CoinsTable
