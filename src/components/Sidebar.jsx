
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Coins,
  Bell,
  UserCheck,
  TrendingUp
} from 'lucide-react'
import useCoinStore from '../store/useCoinStore'
import { cn } from '../lib/utils'

const Sidebar = () => {
  const { view, setView, wallet } = useCoinStore()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Analytics' },
    { id: 'wallets', label: 'Wallets', icon: Wallet, group: 'Management' },
    { id: 'contracts', label: 'Contracts', icon: FileText, group: 'Management' },
    { id: 'coins', label: 'Coins', icon: Coins, group: 'Discovery' },
    { id: 'alerts', label: 'Alerts', icon: Bell, group: 'Management' },
    { id: 'smart-money', label: 'Smart Money', icon: UserCheck, group: 'Discovery' },
    { id: 'trending', label: 'Trending', icon: TrendingUp, group: 'Discovery' },
  ]

  const groups = ['Analytics', 'Discovery', 'Management']

  return (
    <div className="w-64 bg-card h-screen flex flex-col border-r border-border shrink-0">
      <div className="p-8">
        <h1 className="text-2xl font-black text-primary tracking-tighter italic">ACHILYON</h1>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-50">Discovery Terminal</p>
      </div>

      <nav className="flex-1 px-4 space-y-8 overflow-y-auto pb-8">
        {groups.map(group => (
          <div key={group} className="space-y-2">
            <h3 className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50 mb-3">{group}</h3>
            <div className="space-y-1">
              {navItems.filter(i => i.group === group).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={cn(
                    "flex items-center w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group",
                    view === item.id
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 mr-3 transition-transform group-hover:scale-110",
                    view === item.id ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {wallet.connected && (
        <div className="p-4 mx-4 mb-4 bg-muted/50 rounded-2xl border border-border">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-500 shrink-0"></div>
             <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{wallet.address}</p>
                <p className="text-[10px] text-primary font-bold">{wallet.balance} ETH</p>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sidebar
