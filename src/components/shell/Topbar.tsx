'use client'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Kbd } from '@/components/ui/primitives'
import { useRealtimeStore } from '@/stores/realtime'
import { cn } from '@/lib/cn'
import { Logo } from './Logo'
import { NetworkSelector } from './NetworkSelector'
import { NotificationsMenu } from './NotificationsMenu'
import { WalletButton } from './WalletButton'
import { SearchCommand } from './SearchCommand'

function LiveStatus() {
  const status = useRealtimeStore((s) => s.status)
  const label = { connecting: 'Connecting', live: 'Live', polling: 'Polling', offline: 'Paused' }[status]
  const color = { connecting: 'bg-primary', live: 'bg-up', polling: 'bg-warn', offline: 'bg-subtle' }[status]
  return (
    <div className="hidden items-center gap-2 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted xl:flex" title={status === 'polling' ? 'Streaming unavailable — refreshing periodically' : 'Real-time updates'}>
      <span className={cn('h-1.5 w-1.5 rounded-full', color, status === 'live' && 'animate-pulse')} aria-hidden />
      {label}
    </div>
  )
}

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearchOpen((o) => !o) }
      else if (e.key === '/' && !typing) { e.preventDefault(); setSearchOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-bg/80 px-3 backdrop-blur-xl sm:gap-3 sm:px-5">
        <Logo compact className="lg:hidden" />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="ml-auto flex h-9 items-center gap-2.5 rounded-xl border border-line bg-white/[0.03] px-3 text-sm text-subtle transition-colors hover:border-line-strong hover:text-muted lg:ml-0 lg:w-[420px]"
          aria-label="Search tokens (Ctrl+K)"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="hidden lg:inline">Search tokens, pairs, addresses…</span>
          <span className="ml-auto hidden items-center gap-1 lg:flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
        </button>
        <div className="flex items-center gap-2 lg:ml-auto">
          <LiveStatus />
          <NetworkSelector />
          <NotificationsMenu />
          <WalletButton />
        </div>
      </header>
      <SearchCommand open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
