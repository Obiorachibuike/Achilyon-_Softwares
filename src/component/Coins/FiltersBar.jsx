import { ChevronDown, Filter } from 'lucide-react';

const timeframes = ['1h', '6h', '24h', '7d'];

const FiltersBar = () => {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-6 bg-dark-lighter p-4 rounded-xl border border-dark-accent">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Network:</span>
        <button className="flex items-center gap-2 bg-dark-accent px-3 py-1.5 rounded-lg text-sm hover:bg-dark-accent/80 transition-colors">
          All Networks <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">DEX:</span>
        <button className="flex items-center gap-2 bg-dark-accent px-3 py-1.5 rounded-lg text-sm hover:bg-dark-accent/80 transition-colors">
          All DEXes <ChevronDown size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 border-l border-dark-accent pl-4">
        <span className="text-sm text-gray-400">Age:</span>
        <div className="flex bg-dark-accent rounded-lg p-1">
          {timeframes.map(tf => (
            <button key={tf} className="px-3 py-1 text-xs rounded-md hover:bg-dark-lighter transition-colors">
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1"></div>

      <button className="flex items-center gap-2 bg-blue-600/10 text-blue-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600/20 transition-colors">
        <Filter size={16} />
        More Filters
      </button>
    </div>
  );
};

export default FiltersBar;
