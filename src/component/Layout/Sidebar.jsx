import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  FileCode,
  Coins,
  Bell,
  TrendingUp,
  Users
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Wallet, label: 'Wallets', path: '/wallets' },
  { icon: FileCode, label: 'Contracts', path: '/contracts' },
  { icon: Coins, label: 'Coins', path: '/coins' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Users, label: 'Smart Money', path: '/smart-money' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
];

const Sidebar = () => {
  return (
    <div className="w-64 bg-dark-lighter h-screen border-r border-dark-accent flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-blue-500">TERMINAL</h1>
      </div>
      <nav className="flex-1 px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1",
                isActive
                  ? "bg-blue-600/10 text-blue-500"
                  : "text-gray-400 hover:text-white hover:bg-dark-accent"
              )
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
