import { LayoutDashboard, Wallet, FileText, Coins, Bell, TrendingUp, Users, Bot } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Wallet, label: 'Wallets', path: '/wallets' },
  { icon: FileText, label: 'Contracts', path: '/contracts' },
  { icon: Coins, label: 'Coins', path: '/coins' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Users, label: 'Smart Money', path: '/smart-money' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
  { icon: Bot, label: 'Bot Terminal', path: '/bot' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          TERMINAL
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
              location.pathname === item.path
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
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
