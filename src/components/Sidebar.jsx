
import {
  LayoutDashboard,
  Sun,
  Moon,
  Wallet,
  FileText,
  Coins,
  Bell,
  UserCheck,
  TrendingUp
} from 'lucide-react'
import useCoinStore from '../store/useCoinStore'
import { cn } from '../lib/utils'

const Sidebar = ({ isLight, menuOpen, onClose, onToggleTheme }) => {
  const { view, setView } = useCoinStore()

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wallets', label: 'Wallets', icon: Wallet },
    { id: 'contracts', label: 'Contracts', icon: FileText },
    { id: 'coins', label: 'Coins', icon: Coins },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'smart-money', label: 'Smart Money', icon: UserCheck },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
  ]

  return (
    <>
    {menuOpen && <button className="mobile-nav-overlay" onClick={onClose} aria-label="Close navigation menu" />}
    <div className={cn("desktop-sidebar w-64 bg-secondary h-screen flex flex-col border-r border-border shrink-0", menuOpen && "mobile-nav-open")}>
      <div className="p-6 pb-8">
        <h1 className="brand text-2xl font-bold text-primary">NEXUS<span className="text-white">.</span></h1>
        <p className="text-[10px] uppercase tracking-[.22em] text-muted-foreground mt-2">Market intelligence</p>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setView(item.id); onClose() }}
            className={cn(
              "nav-item flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-all", 
              view === item.id
                ? "active bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </button>
        ))}
      </nav>
      <button onClick={onToggleTheme} className="mx-4 mb-5 flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors" aria-label="Toggle color theme">
        {isLight ? <Moon size={17} /> : <Sun size={17} />}
        {isLight ? 'Dark mode' : 'Light mode'}
      </button>
    </div>
  </>
  )
}

export default Sidebar
