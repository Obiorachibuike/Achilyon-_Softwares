'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useWatchlistStore } from '@/stores/watchlist'
import { useWallet } from '@/stores/wallet'
import { useMounted } from '@/hooks/useMounted'
import { publicConfig } from '@/lib/config'
import { shortAddress } from '@/lib/format'
import { DemoBadge } from '@/components/ui/feedback'
import { Logo } from './Logo'
import { ACCOUNT_NAV, FOOTER_NAV, PRIMARY_NAV, TOOLS_NAV, isActive, type NavItem } from './nav'

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const active = isActive(pathname, item)
  const mounted = useMounted()
  const count = useWatchlistStore((s) => s.items.length)
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors',
        active ? 'bg-white/[0.06] text-fg' : 'text-muted hover:bg-white/[0.03] hover:text-fg',
      )}
    >
      {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_12px_rgb(59_130_246)]" aria-hidden />}
      <Icon className={cn('h-[17px] w-[17px] shrink-0', active ? 'text-primary' : 'text-subtle group-hover:text-muted')} aria-hidden />
      <span className="truncate">{item.label}</span>
      {item.badge === 'watchlist' && mounted && count > 0 && <span className="num ml-auto rounded-md bg-gold/15 px-1.5 text-[10.5px] font-semibold text-gold">{count}</span>}
    </Link>
  )
}

function Section({ title, items, onNavigate }: { title?: string; items: NavItem[]; onNavigate?: () => void }) {
  return (
    <div>
      {title && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle/80">{title}</p>}
      <ul className="space-y-0.5">
        {items.map((i) => <li key={i.href}><NavLink item={i} onNavigate={onNavigate} /></li>)}
      </ul>
    </div>
  )
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { status, address, openModal } = useWallet()
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Logo />
      </div>
      <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-2 scrollbar-none">
        <Section title="Markets" items={PRIMARY_NAV} onNavigate={onNavigate} />
        <Section title="You" items={ACCOUNT_NAV} onNavigate={onNavigate} />
        <Section title="Tools" items={TOOLS_NAV} onNavigate={onNavigate} />
      </nav>
      <div className="shrink-0 space-y-3 border-t border-line p-3">
        <Section items={FOOTER_NAV} onNavigate={onNavigate} />
        {status === 'connected' && address ? (
          <div className="flex items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3 py-2 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-up" aria-hidden /> <span className="font-mono">{shortAddress(address)}</span>
          </div>
        ) : (
          <button type="button" onClick={() => { onNavigate?.(); openModal() }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
            <Wallet className="h-4 w-4" aria-hidden /> Connect Wallet
          </button>
        )}
        {publicConfig.demoMode && <div className="flex justify-center"><DemoBadge label="Demo mode" /></div>}
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[248px] shrink-0 border-r border-line bg-bg-2/60 lg:block">
      <SidebarContent />
    </aside>
  )
}
