import { NavLink } from 'react-router-dom'
import { Sun, Moon, Command, X } from 'lucide-react'
import { NAV_ITEMS } from '../nav'
import { cn } from '../lib/utils'
import useThemeStore from '../store/useThemeStore'
import useWatchlistStore from '../store/useWatchlistStore'
import useAlertStore from '../store/useAlertStore'
import Logo from './Logo'


export default function Sidebar({ open, onClose, onOpenPalette }) {
  const { theme, toggleTheme } = useThemeStore()
  const watchCount = useWatchlistStore((s) => s.items.length)
  const triggered = useAlertStore((s) => s.alerts.filter((a) => a.status === 'triggered').length)
  const activeAlerts = useAlertStore((s) => s.alerts.filter((a) => a.status === 'active').length)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

  return (
    <>
      <div className={cn('sidebar-overlay', open && 'is-open')} onClick={onClose} aria-hidden="true" />
      <aside className={cn('sidebar flex w-64 shrink-0 flex-col border-r border-border bg-secondary/70 backdrop-blur-xl', open && 'is-open')} aria-label="Primary">
        <div className="flex items-center justify-between px-5 pb-6 pt-6">
          <Logo />
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground md:hidden" aria-label="Close navigation menu">
            <X size={20} />
          </button>
        </div>

        <button type="button" onClick={onOpenPalette} className="mx-4 mb-4 flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          <Command size={15} /> Quick search
          <kbd className="ml-auto rounded border border-border px-1.5 text-[10px]">{isMac ? '⌘' : 'Ctrl'} K</kbd>
        </button>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_ITEMS.map((item) => {
            const badge = item.badge === 'watchlist' ? watchCount : item.badge === 'alerts' ? (triggered || activeAlerts) : 0
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive ? 'active bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {badge > 0 && (
                  <span className={cn('rounded-full px-1.5 text-[10px] font-bold', item.badge === 'alerts' && triggered ? 'bg-red-500 text-white' : 'bg-background/40')}>
                    {badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="space-y-3 p-4">
          <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground" aria-label="Toggle color theme">
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <p className="px-1 text-[10px] leading-relaxed text-muted-foreground">Market data by DexScreener. Security data by GoPlus. Not financial advice.</p>
        </div>
      </aside>
    </>
  )
}
