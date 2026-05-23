import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import PropTypes from 'prop-types';

const CoinsTable = ({ data, isLoading }) => {
  const columns = [
    {
      accessorKey: 'baseToken.name',
      header: 'Token',
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-dark-accent flex items-center justify-center text-xs font-bold">
            {info.row.original.baseToken.symbol[0]}
          </div>
          <div>
            <div className="font-bold">{info.row.original.baseToken.name}</div>
            <div className="text-xs text-gray-500 uppercase">{info.row.original.baseToken.symbol}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'priceUsd',
      header: 'Price',
      cell: info => `$${parseFloat(info.getValue()).toLocaleString()}`,
    },
    {
      accessorKey: 'priceChange.h24',
      header: '24h %',
      cell: info => {
        const val = info.getValue();
        return (
          <span className={val >= 0 ? 'text-green-500' : 'text-red-500'}>
            {val > 0 ? '+' : ''}{val}%
          </span>
        );
      },
    },
    {
      accessorKey: 'volume.h24',
      header: 'Volume 24h',
      cell: info => `$${info.getValue()?.toLocaleString()}`,
    },
    {
      accessorKey: 'liquidity.usd',
      header: 'Liquidity',
      cell: info => `$${info.getValue()?.toLocaleString()}`,
    },
    {
      accessorKey: 'fdv',
      header: 'MCAP (FDV)',
      cell: info => `$${info.getValue()?.toLocaleString()}`,
    },
    {
      accessorKey: 'dexId',
      header: 'DEX',
      cell: info => <span className="capitalize text-gray-400">{info.getValue()}</span>,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return <div className="text-center py-20 text-gray-400">Loading tokens...</div>;
  }

  return (
    <div className="overflow-x-auto bg-dark-lighter rounded-xl border border-dark-accent">
      <table className="w-full text-left border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b border-dark-accent">
              {headerGroup.headers.map(header => (
                <th key={header.id} className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-b border-dark-accent/50 hover:bg-dark-accent/30 transition-colors cursor-pointer">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="p-4 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

CoinsTable.propTypes = {
  data: PropTypes.array.isRequired,
  isLoading: PropTypes.bool,
};

export default CoinsTable;
