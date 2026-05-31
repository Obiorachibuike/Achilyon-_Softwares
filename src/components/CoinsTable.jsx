
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber } from '../lib/utils'
import { calculateTrendingScore } from '../lib/trending'
import PropTypes from 'prop-types'
import { TrendingUp, ShieldCheck } from 'lucide-react'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
          {info.getValue()?.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-1">
             <span className="font-bold">{info.getValue()}</span>
             {info.row.original.info?.imageUrl && <ShieldCheck size={12} className="text-blue-400" />}
          </div>
          <span className="text-[10px] text-muted-foreground uppercase">{info.row.original.dexId}</span>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => <span className="font-mono">{formatCurrency(parseFloat(info.getValue()))}</span>,
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => <span className="font-medium">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
      <div className="flex flex-col">
        <span className="font-medium">${formatCompactNumber(info.getValue())}</span>
        <div className="w-16 h-1 bg-secondary rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${Math.min((info.getValue() / 1000000) * 100, 100)}%` }}></div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => <span className="font-medium">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const buys = info.getValue()?.buys || 0
      const sells = info.getValue()?.sells || 0
      const total = buys + sells
      const buyRatio = total > 0 ? (buys / total) * 100 : 0
      return (
        <div className="flex flex-col gap-1 w-24">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{buys}</span>
            <span className="text-red-500">{sells}</span>
          </div>
          <div className="flex h-1.5 w-full bg-red-500/20 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${buyRatio}%` }}></div>
          </div>
        </div>
      )
    }
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return (
        <span className="text-muted-foreground text-xs">
          {age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`}
        </span>
      )
    },
  }),
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      return (
        <div className={`flex items-center gap-1 font-bold ${score > 50 ? 'text-orange-500' : 'text-muted-foreground'}`}>
           <TrendingUp size={14} />
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
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead className="bg-muted/50 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-md">
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
        <tbody className="divide-y divide-border/50">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-primary/5 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <div className="p-20 text-center text-muted-foreground">
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
