import { useEffect, useState } from 'react';
import FiltersBar from './Coins/FiltersBar';
import CoinsTable from './Coins/CoinsTable';
import { coinService } from '../services/coinService';

const CoinsPage = () => {
  const [pairs, setPairs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPairs = async () => {
      setIsLoading(true);
      const data = await coinService.getLatestPairs();
      setPairs(data);
      setIsLoading(false);
    };

    fetchPairs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Discovery</h1>
          <p className="text-gray-400 text-sm">Find the next gem across multiple chains and DEXes.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-dark-lighter border border-dark-accent p-4 rounded-xl text-center">
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Total Pairs</div>
            <div className="text-xl font-bold">12,482</div>
          </div>
          <div className="bg-dark-lighter border border-dark-accent p-4 rounded-xl text-center">
            <div className="text-xs text-gray-500 uppercase font-bold mb-1">New (24h)</div>
            <div className="text-xl font-bold text-green-500">842</div>
          </div>
        </div>
      </div>

      <FiltersBar />
      <CoinsTable data={pairs} isLoading={isLoading} />
    </div>
  );
};

export default CoinsPage;
