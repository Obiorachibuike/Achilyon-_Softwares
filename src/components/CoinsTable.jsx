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
    cell: info => {
      const chain = info.row.original.chainId;
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            {info.getValue()?.slice(0, 2)}
          </div>
          <div>
            <div className="font-bold flex items-center gap-2">
              {info.getValue()}
              <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground uppercase">
                {chain}
              </span>
            </div>
            <div className="text-xs text-muted-foreground uppercase">{info.row.original.baseToken.name}</div>
          </div>
        </div>
      )
    },
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => <div className="font-mono">{formatCurrency(parseFloat(info.getValue()))}</div>,
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
    header: 'Volume',
    cell: info => `$${formatCompactNumber(info.getValue())}`,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return 'N/A';
      const ageHours = (Date.now() - info.getValue()) / 1000 / 60 / 60
      if (ageHours < 1) return `${Math.floor(ageHours * 60)}m`
      return ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const buys = info.getValue()?.buys || 0;
      const sells = info.getValue()?.sells || 0;
      const total = buys + sells;
      const buyPercent = total > 0 ? (buys / total) * 100 : 50;

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
    }
  }),
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original);
      return (
        <div className={cn(
          "inline-flex items-center px-2 py-1 rounded text-xs font-bold",
          score > 50 ? "bg-green-500/20 text-green-500" :
          score > 20 ? "bg-yellow-500/20 text-yellow-500" : "bg-muted text-muted-foreground"
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
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[11px] tracking-wider sticky top-0 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4 font-semibold">
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
        <div className="p-20 text-center text-muted-foreground italic">
          No pairs found matching your filters...
        </div>
      )}
    </div>
  )
}

CoinsTable.propTypes = {
  data: PropTypes.array.isRequired,
}

export default CoinsTable
