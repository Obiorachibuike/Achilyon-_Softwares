
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
    cell: info => {
      const chainId = info.row.original.chainId;
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
            {info.getValue()?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{info.getValue()}</span>
              <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground uppercase font-bold tracking-wider">
                {chainId}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate w-24">
              {info.row.original.baseToken.name}
            </div>
          </div>
        </div>
      )
    },
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
      <div className="font-medium">
        {formatCurrency(parseFloat(info.getValue() || 0))}
      </div>
    ),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => (
      <div className="text-muted-foreground">
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
      <div className="text-muted-foreground">
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => (
      <div className="text-foreground font-medium">
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      const timestamp = info.getValue();
      if (!timestamp) return 'N/A';
      const ageMs = Date.now() - timestamp;
      const ageHours = ageMs / 1000 / 60 / 60;
      if (ageHours < 1) return `${(ageHours * 60).toFixed(0)}m`;
      if (ageHours < 24) return `${ageHours.toFixed(1)}h`;
      return `${(ageHours / 24).toFixed(1)}d`;
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const txns = info.getValue() || { buys: 0, sells: 0 };
      const total = (txns.buys || 0) + (txns.sells || 0);
      const buyPercent = total > 0 ? (txns.buys / total) * 100 : 50;

      return (
        <div className="space-y-1 w-24">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{txns.buys}</span>
            <span className="text-red-500">{txns.sells}</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all duration-500"
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
      const score = info.getValue() || 0;
      return (
        <div className={cn(
          "font-bold text-center px-2 py-1 rounded",
          score > 80 ? "text-orange-500 bg-orange-500/10" :
          score > 50 ? "text-yellow-500 bg-yellow-500/10" :
          "text-blue-500 bg-blue-500/10"
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
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] font-bold tracking-widest border-b border-border">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-4 font-semibold">
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
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-primary/5 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-4 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="p-20 text-center text-muted-foreground italic">
          No tokens found matching your filters.
        </div>
      )}
    </div>
  )
}

CoinsTable.propTypes = {
  data: PropTypes.array.isRequired,
}

export default CoinsTable
