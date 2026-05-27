import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from '@tanstack/react-table';
import { useCoinStore } from '../store/useCoinStore';
import { formatCurrency, formatCompactNumber, cn } from '../lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function CoinsTable() {
  const { coins, loading } = useCoinStore();

  const columns = [
    {
      accessorKey: 'baseToken',
      header: 'Token',
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs">
            {row.original.baseToken.symbol[0]}
          </div>
          <div>
            <div className="font-medium">{row.original.baseToken.name}</div>
            <div className="text-xs text-neutral-500">{row.original.baseToken.symbol}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'priceUsd',
      header: 'Price',
      cell: ({ getValue }) => <div className="font-mono text-sm">{formatCurrency(getValue())}</div>,
    },
    {
      accessorKey: 'fdv',
      header: 'MCAP',
      cell: ({ getValue }) => <div className="text-sm font-medium">{formatCompactNumber(getValue())}</div>,
    },
    {
      accessorKey: 'liquidity.usd',
      header: 'Liquidity',
      cell: ({ row }) => <div className="text-sm font-medium">{formatCompactNumber(row.original.liquidity?.usd || 0)}</div>,
    },
    {
      accessorKey: 'volume.h24',
      header: 'Volume (24h)',
      cell: ({ row }) => <div className="text-sm font-medium">{formatCompactNumber(row.original.volume?.h24 || 0)}</div>,
    },
    {
      accessorKey: 'priceChange.h24',
      header: '24h Change',
      cell: ({ getValue }) => {
        const val = getValue() || 0;
        const isPositive = val >= 0;
        return (
          <div className={cn("flex items-center text-sm font-medium", isPositive ? "text-emerald-400" : "text-rose-400")}>
            {isPositive ? <ArrowUpRight size={14} className="mr-1" /> : <ArrowDownRight size={14} className="mr-1" />}
            {Math.abs(val).toFixed(2)}%
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: coins,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-neutral-900/50 sticky top-0 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-6 py-4 text-xs font-bold uppercase text-neutral-500 border-b border-neutral-800">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-neutral-900/50 transition-colors group">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
