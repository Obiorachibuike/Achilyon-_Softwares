import { TrendingUp, Activity, BarChart3, Zap, ArrowUpRight, ArrowDownRight, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Dashboard() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Market Overview</h2>
        <div className="text-sm text-muted-foreground">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Market Volatility', value: 'High', icon: Activity, color: 'text-orange-500' },
          { label: 'New Pairs (1h)', value: '142', icon: Zap, color: 'text-yellow-500' },
          { label: 'Smart Money Inflow', value: '$12.4M', icon: TrendingUp, color: 'text-green-500' },
          { label: 'Global Volume', value: '$1.2B', icon: BarChart3, color: 'text-blue-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border p-4 rounded-xl flex items-center space-x-4">
            <div className={stat.color}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-4 min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold">Trending Narratives</h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">AI POWERED</span>
          </div>
          <div className="space-y-4">
            {[
              { tag: 'AI Agents', strength: 92, change: 12.5, coins: 42 },
              { tag: 'DePIN', strength: 84, change: -2.1, coins: 18 },
              { tag: 'Base Ecosystem', strength: 78, change: 45.2, coins: 156 },
              { tag: 'RWA', strength: 65, change: 5.4, coins: 24 },
            ].map((narrative, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-8 bg-primary rounded-full" />
                  <div>
                    <div className="text-sm font-bold">{narrative.tag}</div>
                    <div className="text-[10px] text-muted-foreground">{narrative.coins} active tokens</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">{narrative.strength} pts</div>
                  <div className={cn("text-[10px] flex items-center justify-end", narrative.change > 0 ? "text-green-500" : "text-red-500")}>
                    {narrative.change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(narrative.change)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold">Global Network Activity</h3>
            <Globe size={16} className="text-muted-foreground" />
          </div>
          <div className="flex-1 space-y-6">
            {[
              { chain: 'Ethereum', tps: 14.5, load: 65, status: 'Stable' },
              { chain: 'Solana', tps: 2840, load: 42, status: 'Fast' },
              { chain: 'Base', tps: 84.2, load: 88, status: 'Congested' },
              { chain: 'Arbitrum', tps: 42.1, load: 24, status: 'Stable' },
            ].map((network, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">{network.chain}</span>
                  <span className="text-muted-foreground">{network.tps} TPS • {network.status}</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      network.load > 80 ? "bg-red-500" : network.load > 50 ? "bg-yellow-500" : "bg-green-500"
                    )}
                    style={{ width: `${network.load}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
