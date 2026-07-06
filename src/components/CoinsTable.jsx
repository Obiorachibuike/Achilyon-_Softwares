
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
      const pair = info.row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
            {info.getValue()?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{info.getValue()}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                {pair.chainId}
              </span>
            </div>
            <div className="text-xs text-muted-foreground uppercase">{pair.quoteToken?.symbol}</div>
          </div>
        </div>
      )
    },
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => {
      const val = parseFloat(info.getValue());
      return <div className="font-mono">{formatCurrency(val)}</div>;
    },
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => <div className="font-medium">${formatCompactNumber(info.getValue())}</div>,
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => <div className="text-muted-foreground">${formatCompactNumber(info.getValue())}</div>,
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => <div className="font-medium">${formatCompactNumber(info.getValue())}</div>,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return <span className="text-muted-foreground">-</span>;
      const ageHours = (Date.now() - info.getValue()) / 1000 / 60 / 60;
      return (
        <div className="text-xs">
          {ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`}
        </div>
      );
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const buys = info.getValue()?.buys || 0;
      const sells = info.getValue()?.sells || 0;
      const total = buys + sells;
      const buyRatio = total > 0 ? (buys / total) * 100 : 50;

      return (
        <div className="w-24 space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{buys}</span>
            <span className="text-red-500">{sells}</span>
          </div>
          <div className="h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${buyRatio}%` }}
            />
          </div>
        </div>
      );
    },
  }),
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original);
      return (
        <div className={cn(
          "font-bold text-center px-2 py-1 rounded text-xs",
          score >= 70 ? "bg-green-500/10 text-green-500" :
          score >= 40 ? "bg-yellow-500/10 text-yellow-500" :
          "bg-muted text-muted-foreground"
        )}>
          {score}
        </div>
      );
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
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4 font-bold border-b border-border">
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
          {data.length === 0 && (
             <tr>
               <td colSpan={columns.length} className="px-6 py-12 text-center text-muted-foreground italic">
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
