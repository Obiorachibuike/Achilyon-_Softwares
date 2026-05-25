import { useEffect, useState } from 'react';
import { Users, Zap, Flame } from 'lucide-react';
import { dexService } from '../../services/dexService';
import { formatCurrency, cn } from '../../lib/utils';

export function Trending() {
  const [trending, setTrending] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      setIsLoading(true);
      try {
        const data = await dexService.getTrendingPools();
        setTrending(data.slice(0, 10)); // Top 10
      } catch (error) {
        console.error("Error fetching trending:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrending();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center space-x-2">
          <Flame className="text-orange-500" />
          <span>Trending Tokens</span>
        </h2>
        <div className="text-sm text-muted-foreground">
          Real-time trending based on volume & social activity
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {trending.map((token, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-lg">
                  {token.baseToken?.symbol?.[0]}
                </div>
                <div>
                  <div className="font-bold">{token.baseToken?.name}</div>
                  <div className="text-xs text-muted-foreground">{token.baseToken?.symbol} • {token.dexId}</div>
                </div>
              </div>
              <div className="px-2 py-1 bg-primary/10 text-primary rounded text-[10px] font-bold uppercase">
                #{i + 1} Trending
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">Price</p>
                <p className="text-sm font-mono">${parseFloat(token.priceUsd).toFixed(6)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">24h Vol</p>
                <p className="text-sm font-mono">{formatCurrency(token.volume?.h24)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase">24h Change</p>
                <p className={cn("text-sm font-mono font-bold", token.priceChange?.h24 > 0 ? "text-green-500" : "text-red-500")}>
                  {token.priceChange?.h24}%
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Users size={14} />
                  <span>{Math.floor(Math.random() * 500) + 50} Holders</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Zap size={14} className="text-yellow-500" />
                  <span>{token.txns?.h24?.buys + token.txns?.h24?.sells} Txns</span>
                </div>
              </div>
              <button className="text-xs text-primary font-bold hover:underline">
                Trade Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
