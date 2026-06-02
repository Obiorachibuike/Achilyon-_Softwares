
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
        {info.row.original.info?.imageUrl && (
          <img src={info.row.original.info.imageUrl} alt={info.getValue()} className="w-6 h-6 rounded-full" />
        )}
        <div className="flex flex-col">
          <div className="font-bold text-foreground">{info.getValue()}</div>
          <div className="flex items-center gap-1">
             <span className="text-[10px] text-muted-foreground uppercase">{info.row.original.chainId}</span>
             <span className="text-[10px] text-muted-foreground">/</span>
             <span className="text-[10px] text-muted-foreground">{info.row.original.dexId}</span>
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: () => <div className="text-right">Price</div>,
    cell: info => <div className="text-right font-medium">{formatCurrency(parseFloat(info.getValue()))}</div>,
  }),
  columnHelper.accessor('fdv', {
    header: () => <div className="text-right">MCAP</div>,
    cell: info => <div className="text-right text-muted-foreground">${formatCompactNumber(info.getValue())}</div>,
  }),
  columnHelper.accessor('liquidity.usd', {
    header: () => <div className="text-right">Liquidity</div>,
    cell: info => <div className="text-right text-muted-foreground">${formatCompactNumber(info.getValue())}</div>,
  }),
  columnHelper.accessor('volume.h24', {
    header: () => <div className="text-right">Volume (24h)</div>,
    cell: info => <div className="text-right text-muted-foreground">${formatCompactNumber(info.getValue())}</div>,
  }),
  columnHelper.accessor('txns.h24', {
    header: () => <div className="text-right">Buys/Sells</div>,
    cell: info => {
      const txns = info.getValue() || { buys: 0, sells: 0 }
      return (
        <div className="text-right flex flex-col items-end">
          <div className="text-xs">
            <span className="text-green-500">{txns.buys}</span>
            <span className="mx-1 text-muted-foreground">/</span>
            <span className="text-red-500">{txns.sells}</span>
          </div>
          <div className="w-16 h-1 bg-secondary rounded-full mt-1 overflow-hidden flex">
            <div
              className="bg-green-500 h-full"
              style={{ width: `${(txns.buys / (txns.buys + txns.sells || 1)) * 100}%` }}
            />
            <div
              className="bg-red-500 h-full flex-1"
            />
          </div>
        </div>
      )
    },
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: () => <div className="text-right">Age</div>,
    cell: info => {
      if (!info.getValue()) return <div className="text-right text-muted-foreground">-</div>
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return <div className="text-right text-muted-foreground">{age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`}</div>
    },
  }),
  columnHelper.display({
    id: 'trend',
    header: () => <div className="text-right">Trend</div>,
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      return (
        <div className="text-right">
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold",
            score > 100 ? "bg-orange-500/20 text-orange-500" :
            score > 50 ? "bg-blue-500/20 text-blue-500" :
            "bg-muted text-muted-foreground"
          )}>
            {score}
          </span>
        </div>
      )
    }
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
        <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-3 border-b border-border">
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
              <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground italic">
                No pairs found matching filters.
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
