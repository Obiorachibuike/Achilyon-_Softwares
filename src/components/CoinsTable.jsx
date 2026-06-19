
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber, cn } from '../lib/utils'
import { calculateTrendScore } from '../lib/trending'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken', {
    header: 'Token',
    cell: info => {
      const { symbol, name } = info.getValue()
      const chainId = info.row.original.chainId
      return (
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">{symbol}</span>
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                chainId === 'ethereum' ? 'bg-blue-500/20 text-blue-500' :
                chainId === 'solana' ? 'bg-purple-500/20 text-purple-500' :
                chainId === 'base' ? 'bg-blue-400/20 text-blue-400' :
                chainId === 'bsc' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-muted text-muted-foreground'
              )}>
                {chainId === 'bsc' ? 'BNB' : chainId}
              </span>
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">{name}</span>
          </div>
        </div>
      )
    },
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
    cell: info => <span className="font-medium text-muted-foreground">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => <span className="font-medium text-muted-foreground">${formatCompactNumber(info.getValue())}</span>,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return '-'
      const ageInHours = (Date.now() - info.getValue()) / 1000 / 60 / 60
      if (ageInHours < 1) return `${(ageInHours * 60).toFixed(0)}m`
      return ageInHours < 24 ? `${ageInHours.toFixed(1)}h` : `${(ageInHours / 24).toFixed(1)}d`
    },
  }),
  columnHelper.accessor('txns.h1', {
    header: 'Buys/Sells (1h)',
    cell: info => {
      const { buys, sells } = info.getValue() || { buys: 0, sells: 0 }
      const total = buys + sells
      const buyPercent = total > 0 ? (buys / total) * 100 : 50
      return (
        <div className="flex flex-col gap-1 w-24">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{buys}</span>
            <span className="text-red-500">{sells}</span>
          </div>
          <div className="h-1 w-full bg-red-500/20 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-green-500"
              style={{ width: `${buyPercent}%` }}
            />
          </div>
        </div>
      )
    },
  }),
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendScore(info.row.original)
      return (
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
            score > 70 ? "bg-green-500/20 text-green-500" :
            score > 40 ? "bg-yellow-500/20 text-yellow-500" : "bg-muted text-muted-foreground"
          )}>
            {score}
          </div>
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
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
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
                <td key={cell.id} className="px-6 py-4 text-sm border-b border-border/50">
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
