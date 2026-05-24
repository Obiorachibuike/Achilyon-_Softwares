import { TrendingUp, Activity, BarChart3, Zap } from 'lucide-react';

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
          <h3 className="font-bold mb-4">Trending Narratives</h3>
          <div className="flex-1 flex items-center justify-center text-muted-foreground italic">
            Narrative analysis engine starting...
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 min-h-[300px] flex flex-col">
          <h3 className="font-bold mb-4">Network Activity</h3>
          <div className="flex-1 flex items-center justify-center text-muted-foreground italic">
            Connecting to indexers...
          </div>
        </div>
      </div>
    </div>
  );
}
