import { LayoutDashboard, Wallet, FileText, Coins, Bell, TrendingUp, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCoinStore } from '../../store/useCoinStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Wallet, label: 'Wallets', id: 'wallets' },
  { icon: FileText, label: 'Contracts', id: 'contracts' },
  { icon: Coins, label: 'Coins', id: 'coins' },
  { icon: Bell, label: 'Alerts', id: 'alerts' },
  { icon: Users, label: 'Smart Money', id: 'smart-money' },
  { icon: TrendingUp, label: 'Trending', id: 'trending' },
];

export function Sidebar() {
  const { currentView, setView } = useCoinStore();

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          TERMINAL
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
              currentView === item.id
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">User Wallet</p>
            <p className="text-xs text-muted-foreground truncate">0x1234...5678</p>
          </div>
        </div>
      </div>
    </div>
  );
}
