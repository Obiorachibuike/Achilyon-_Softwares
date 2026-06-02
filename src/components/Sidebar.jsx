
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Coins,
  Bell,
  UserCheck,
  TrendingUp,
  LineChart,
  ShieldCheck,
  Zap
} from 'lucide-react'
import useCoinStore from '../store/useCoinStore'
import { cn } from '../lib/utils'

const Sidebar = () => {
  const { view, setView } = useCoinStore()

  const navGroups = [
    {
      title: 'Analytics',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'trending', label: 'Trending', icon: TrendingUp },
        { id: 'market', label: 'Market Index', icon: LineChart },
      ]
    },
    {
      title: 'Discovery',
      items: [
        { id: 'coins', label: 'Coins', icon: Coins },
        { id: 'contracts', label: 'Contracts', icon: FileText },
        { id: 'smart-money', label: 'Smart Money', icon: UserCheck },
      ]
    },
    {
      title: 'Personal',
      items: [
        { id: 'wallets', label: 'Wallets', icon: Wallet },
        { id: 'alerts', label: 'Alerts', icon: Bell },
      ]
    }
  ]

  return (
    <div className="w-64 bg-card h-screen flex flex-col border-r border-border">
      <div className="p-8 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Zap className="text-primary-foreground" size={20} fill="currentColor" />
        </div>
        <h1 className="text-xl font-black tracking-tighter text-foreground">TERMINAL</h1>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto pb-8">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <h3 className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {group.title}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={cn(
                    "flex items-center w-full px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
                    view === item.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 mr-3", view === item.id ? "opacity-100" : "opacity-70")} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-secondary/50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-primary-foreground font-bold">
            JD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">Professional</p>
            <p className="text-[10px] text-muted-foreground truncate">Free Plan</p>
          </div>
          <ShieldCheck className="text-primary" size={16} />
        </div>
      </div>
    </div>
  )
}

export default Sidebar
