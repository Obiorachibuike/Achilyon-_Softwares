
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { formatCurrency, formatCompactNumber, getDisplayChainName } from '../lib/utils'
import { calculateTrendingScore } from '../lib/trending'
import PropTypes from 'prop-types'

const columnHelper = createColumnHelper()

const columns = [
  columnHelper.accessor('baseToken.symbol', {
    header: 'Token',
    cell: info => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center font-bold text-xs">
          {info.getValue()?.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">{info.getValue()}</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">
              {getDisplayChainName(info.row.original.chainId)}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[100px]">
            {info.row.original.baseToken.address}
          </div>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('priceUsd', {
    header: 'Price',
    cell: info => (
      <div className="font-medium">
        {formatCurrency(parseFloat(info.getValue()))}
      </div>
    ),
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
    header: 'Volume (24h)',
    cell: info => `$${formatCompactNumber(info.getValue())}`,
  }),
  columnHelper.accessor('pairCreatedAt', {
    header: 'Age',
    cell: info => {
      if (!info.getValue()) return '-'
      const age = (Date.now() - info.getValue()) / 1000 / 60 / 60
      return age < 24 ? `${age.toFixed(1)}h` : `${(age / 24).toFixed(1)}d`
    },
  }),
  columnHelper.accessor('txns.h24', {
    header: 'Buys/Sells',
    cell: info => {
      const buys = parseInt(info.getValue()?.buys || 0)
      const sells = parseInt(info.getValue()?.sells || 0)
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
  columnHelper.display({
    id: 'trend',
    header: 'Trend',
    cell: info => {
      const score = calculateTrendingScore(info.row.original)
      let color = 'text-muted-foreground'
      if (score > 100) color = 'text-red-500'
      else if (score > 50) color = 'text-yellow-500'
      else if (score > 20) color = 'text-green-500'

      return (
        <div className={`font-bold flex items-center gap-1 ${color}`}>
          <span>{score}</span>
          <span className="text-[10px]">pts</span>
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

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>No pairs found matching your filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider sticky top-0 z-10 backdrop-blur-md">
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
  data: PropTypes.arrayOf(PropTypes.shape({
    chainId: PropTypes.string,
    pairAddress: PropTypes.string,
    baseToken: PropTypes.shape({
      symbol: PropTypes.string,
      address: PropTypes.string,
    }),
    priceUsd: PropTypes.string,
    fdv: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    liquidity: PropTypes.shape({
      usd: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    volume: PropTypes.shape({
      h24: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }),
    pairCreatedAt: PropTypes.number,
    txns: PropTypes.shape({
      h24: PropTypes.shape({
        buys: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        sells: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      }),
    }),
  })).isRequired,
}

export default CoinsTable
