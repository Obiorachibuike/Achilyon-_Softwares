
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
            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded uppercase font-black">
              {info.row.original.chainId}
            </span>
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{info.row.original.baseToken.name}</span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
      <div className="font-medium text-foreground">
        {formatCurrency(parseFloat(info.getValue() || 0))}
      </div>
    ),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP (FDV)',
    cell: info => (
      <div className="font-medium">
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
      <div className="font-medium">
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => (
      <div className="font-medium text-primary">
        ${formatCompactNumber(info.getValue() || 0)}
      </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return <span className="text-muted-foreground">-</span>
      const ageMs = Date.now() - info.getValue()
      const ageHours = ageMs / 1000 / 60 / 60
      return (
        <div className="text-muted-foreground font-medium">
          {ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`}
        </div>
      )
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells (24h)',
    cell: info => {
      const txns = info.getValue() || { buys: 0, sells: 0 }
      const total = txns.buys + txns.sells
      const buyPercent = total > 0 ? (txns.buys / total) * 100 : 50

      return (
        <div className="flex flex-col gap-1 w-24">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{txns.buys}</span>
            <span className="text-red-500">{txns.sells}</span>
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
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      return (
        <div className={cn(
          "font-black text-xs px-2 py-1 rounded-full text-center",
          score > 100 ? "bg-orange-500/20 text-orange-500" :
          score > 50 ? "bg-primary/20 text-primary" :
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
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] font-black tracking-widest border-y border-border">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-3 font-bold">
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
                <td key={cell.id} className="px-4 py-4 text-sm whitespace-nowrap">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="p-20 text-center text-muted-foreground italic">
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
