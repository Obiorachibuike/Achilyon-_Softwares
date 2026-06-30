
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber } from '../lib/utils'
import PropTypes from 'prop-types'
import { ExternalLink, TrendingUp } from 'lucide-react'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs border border-border overflow-hidden">
          {info.row.original.info?.imageUrl ? (
            <img src={info.row.original.info.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            info.getValue()?.charAt(0)
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-foreground">{info.getValue()}</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold border border-primary/20">
              {info.row.original.chainId === 'bsc' ? 'BNB' : info.row.original.chainId}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
             {info.row.original.quoteToken?.symbol} • {info.row.original.dexId}
             <ExternalLink size={10} className="inline opacity-50" />
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
      <div className="font-medium text-foreground">
        {formatCurrency(parseFloat(info.getValue()))}
      </div>
    ),
  }),
  columnHelper.accessor('fdv', {
    header: 'MCAP',
    cell: info => (
      <div className="font-medium">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('liquidity.usd', {
    header: 'Liquidity',
    cell: info => (
      <div className="font-medium">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('volume.h24', {
    header: 'Volume (24h)',
    cell: info => (
      <div className="font-medium">
        ${formatCompactNumber(info.getValue())}
      </div>
    ),
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return <span className="text-muted-foreground">-</span>
      const ageHours = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return (
        <div className="text-xs text-muted-foreground">
          {ageHours < 24 ? `${ageHours.toFixed(1)}h` : `${(ageHours / 24).toFixed(1)}d`}
        </div>
      )
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const buys = info.getValue()?.buys || 0
      const sells = info.getValue()?.sells || 0
      const total = buys + sells
      const buyPercent = total > 0 ? (buys / total) * 100 : 50

      return (
        <div className="w-32 space-y-1">
          <div className="flex justify-between text-[10px] font-bold">
            <span className="text-green-500">{buys} B</span>
            <span className="text-red-500">{sells} S</span>
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
      const score = info.getValue() || 0
      return (
        <div className="flex items-center gap-2">
          <div className={`text-sm font-black ${
            score >= 80 ? 'text-blue-500' :
            score >= 60 ? 'text-green-500' :
            score >= 40 ? 'text-yellow-500' : 'text-muted-foreground'
          }`}>
            {Math.round(score)}
          </div>
          <TrendingUp size={14} className={score >= 60 ? 'text-primary' : 'text-muted-foreground/30'} />
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

  if (!data || data.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-muted-foreground bg-card/50">
         <p className="text-lg font-medium">No results found</p>
         <p className="text-sm">Try adjusting your filters or search query</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-widest font-black border-b border-border">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4 font-black">
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
            <tr key={row.id} className="hover:bg-primary/5 transition-all group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 text-sm whitespace-nowrap">
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
