import { useMemo, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table'
import { ArrowUpDown, ExternalLink, Activity } from 'lucide-react'
import useCoinStore from '../store/useCoinStore'
import { formatCurrency, formatCompactNumber, formatPercent, cn } from '../lib/utils'
import { coinService } from '../services/api'

export function CoinsTable() {
  const {
    filters,
    coins,
    setCoins,
    isLoading,
    setIsLoading,
    setError
  } = useCoinStore()

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        let data = []
        if (filters.search) {
          data = await coinService.searchTokens(filters.search)
        } else {
          data = await coinService.getTrending()
        }

        // Filter by chain if not 'all' (though DexScreener search often handles it)
        const filteredData = data.filter(pair => {
          if (filters.chain !== 'all' && pair.chainId !== filters.chain) return false
          if (pair.liquidity?.usd < filters.minLiquidity) return false
          return true
        })

        setCoins(filteredData)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [filters.chain, filters.search, filters.minLiquidity, setCoins, setError, setIsLoading])

  const columns = useMemo(() => [
    {
      accessorKey: 'baseToken',
      header: 'Token',
      cell: ({ row }) => {
        const pair = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">
              {pair.baseToken.symbol[0]}
            </div>
            <div>
              <div className="font-bold flex items-center gap-1">
                {pair.baseToken.symbol}
                <span className="text-[10px] bg-muted px-1 rounded uppercase">{pair.chainId}</span>
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[120px]">{pair.baseToken.name}</div>
            </div>
          </div>
        )
      }
    },
    {
      accessorKey: 'priceUsd',
      header: 'Price',
      cell: ({ row }) => <div className="font-mono">{formatCurrency(parseFloat(row.original.priceUsd))}</div>
    },
    {
      accessorKey: 'priceChange.h24',
      header: '24h %',
      cell: ({ row }) => {
        const change = row.original.priceChange?.h24
        return (
          <div className={cn(
            "font-medium",
            change > 0 ? "text-green-500" : "text-red-500"
          )}>
            {formatPercent(change)}
          </div>
        )
      }
    },
    {
      accessorKey: 'fdv',
      header: 'MCAP (FDV)',
      cell: ({ row }) => <div>{formatCompactNumber(row.original.fdv)}</div>
    },
    {
      accessorKey: 'liquidity.usd',
      header: 'Liquidity',
      cell: ({ row }) => <div>{formatCompactNumber(row.original.liquidity?.usd)}</div>
    },
    {
      accessorKey: 'volume.h24',
      header: 'Volume (24h)',
      cell: ({ row }) => <div>{formatCompactNumber(row.original.volume?.h24)}</div>
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <a
          href={row.original.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 hover:bg-muted rounded-full transition-colors inline-block"
        >
          <ExternalLink size={16} />
        </a>
      )
    }
  ], [])

  const table = useReactTable({
    data: coins,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading && coins.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Activity className="animate-spin text-primary" size={32} />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-card sticky top-0 z-10 border-b border-border">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {header.isPlaceholder ? null : (
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        header.column.getCanSort() && "cursor-pointer select-none"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && <ArrowUpDown size={12} />}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-muted/50 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {coins.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No tokens found matching your filters.
        </div>
      )}
    </div>
  )
}
