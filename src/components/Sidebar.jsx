import { LayoutDashboard, Wallet, FileText, Coins, Bell, ShieldAlert, TrendingUp } from 'lucide-react';
import { useCoinStore } from '../store/useCoinStore';
import { cn } from '../lib/utils';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'coins', label: 'Coins', icon: Coins },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'smart-money', label: 'Smart Money', icon: ShieldAlert },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
];

export default function Sidebar() {
  const { currentView, setCurrentView } = useCoinStore();

  return (
    <div className="w-64 bg-neutral-900 border-r border-neutral-800 h-screen flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Terminal X
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
              currentView === item.id
                ? "bg-blue-600 text-white"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            )}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-neutral-800">
        <div className="flex items-center space-x-3 px-4 py-3 text-neutral-400">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
            JD
          </div>
          <span className="text-sm font-medium">John Doe</span>
        </div>
      </div>
    </div>
  );
}
