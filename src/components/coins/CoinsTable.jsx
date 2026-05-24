import React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from '@tanstack/react-table';
import { useCoinStore } from '../../store/useCoinStore';
import { formatCurrency, cn } from '../../lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function CoinsTable() {
  const { isLoading, getFilteredTokens } = useCoinStore();
  const [sorting, setSorting] = React.useState([]);

  const tokens = getFilteredTokens();

  const columns = [
    {
      accessorKey: 'baseToken.name',
      header: 'Token',
      cell: ({ row }) => {
        const pair = row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs">
              {pair.baseToken?.symbol?.[0] || '?'}
            </div>
            <div>
              <div className="font-bold">{pair.baseToken?.symbol || 'Unknown'}</div>
              <div className="text-xs text-muted-foreground">{pair.dexId}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'priceUsd',
      header: 'Price',
      cell: ({ row }) => formatCurrency(parseFloat(row.original.priceUsd)),
    },
    {
      accessorKey: 'fdv',
      header: 'MCAP',
      cell: ({ row }) => formatCurrency(row.original.fdv),
    },
    {
      accessorKey: 'liquidity.usd',
      header: 'Liquidity',
      cell: ({ row }) => formatCurrency(row.original.liquidity?.usd),
    },
    {
      accessorKey: 'volume.h24',
      header: 'Volume (24h)',
      cell: ({ row }) => formatCurrency(row.original.volume?.h24),
    },
    {
      accessorKey: 'priceChange.h24',
      header: '24h %',
      cell: ({ row }) => {
        const val = row.original.priceChange?.h24;
        if (val === undefined || val === null) return 'N/A';
        const isPositive = val > 0;
        return (
          <div className={cn("flex items-center font-medium", isPositive ? "text-green-500" : "text-red-500")}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(val)}%
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: tokens,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full text-left border-collapse">
        <thead className="bg-card sticky top-0 border-b border-border">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {header.isPlaceholder
                    ? null
                    : (
                      <div
                        className={cn(header.column.getCanSort() ? "cursor-pointer select-none flex items-center" : "")}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted()] ?? null}
                      </div>
                    )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-secondary/30 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="p-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                No tokens found matching the filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
