import {
  LayoutDashboard,
  Wallet,
  FileText,
  Coins,
  Bell,
  TrendingUp,
  Zap,
  Settings,
  LogOut
} from 'lucide-react'
import useCoinStore from '../store/useCoinStore'
import { cn } from '../lib/utils'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'wallets', label: 'Wallets', icon: Wallet },
  { id: 'contracts', label: 'Contracts', icon: FileText },
  { id: 'coins', label: 'Coins', icon: Coins },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'smart-money', label: 'Smart Money', icon: Zap },
  { id: 'trending', label: 'Trending', icon: TrendingUp },
]

export function Sidebar() {
  const { activeView, setActiveView } = useCoinStore()

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <Zap className="fill-primary" />
          <span>Nexus Discovery</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
              activeView === item.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-border">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors">
          <Settings size={20} />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 text-destructive hover:text-destructive/80 transition-colors">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
