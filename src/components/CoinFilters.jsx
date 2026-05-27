import { useCoinStore } from '../store/useCoinStore';

const networks = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'bsc', name: 'BNB' },
  { id: 'solana', name: 'Solana' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'avalanche', name: 'Avalanche' },
];

const ages = [
  { id: '1h', label: '< 1h' },
  { id: '6h', label: '< 6h' },
  { id: '24h', label: '< 24h' },
  { id: '7d', label: '< 7d' },
];

export default function CoinFilters() {
  const { filters, setFilter } = useCoinStore();

  return (
    <div className="bg-neutral-900 border-b border-neutral-800 p-4 flex flex-wrap items-center gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase font-bold text-neutral-500 ml-1">Network</label>
        <select
          value={filters.chain}
          onChange={(e) => setFilter('chain', e.target.value)}
          className="bg-neutral-800 border border-neutral-700 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {networks.map((net) => (
            <option key={net.id} value={net.id}>{net.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase font-bold text-neutral-500 ml-1">Age</label>
        <div className="flex bg-neutral-800 rounded-md p-1 border border-neutral-700">
          {ages.map((age) => (
            <button
              key={age.id}
              onClick={() => setFilter('age', age.id)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filters.age === age.id ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {age.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase font-bold text-neutral-500 ml-1">Liquidity</label>
        <select
          value={filters.minLiquidity}
          onChange={(e) => setFilter('minLiquidity', Number(e.target.value))}
          className="bg-neutral-800 border border-neutral-700 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>All</option>
          <option value={10000}> {'>'} $10k</option>
          <option value={100000}> {'>'} $100k</option>
          <option value={1000000}> {'>'} $1M</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] uppercase font-bold text-neutral-500 ml-1">Volume 24h</label>
        <select
          value={filters.minVolume24h}
          onChange={(e) => setFilter('minVolume24h', Number(e.target.value))}
          className="bg-neutral-800 border border-neutral-700 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={0}>All</option>
          <option value={50000}> {'>'} $50k</option>
          <option value={250000}> {'>'} $250k</option>
          <option value={1000000}> {'>'} $1M</option>
        </select>
      </div>
    </div>
  );
}
