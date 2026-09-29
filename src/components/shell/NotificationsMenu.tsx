'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Rocket, Star, TrendingUp, Info } from 'lucide-react'
import { useNotifications } from '@/stores/notifications'
import { timeAgo } from '@/lib/format'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/cn'

const ICON = { price: TrendingUp, launch: Rocket, trade: TrendingUp, system: Info, watchlist: Star }

export function NotificationsMenu() {
  const { items, markAllRead, clear } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const now = useNow(30_000)
  const unread = items.filter((i) => !i.read).length

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); if (!open) setTimeout(markAllRead, 1500) }}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-line bg-white/[0.03] text-muted hover:text-fg"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && <span className="num absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9.5px] font-bold text-white">{Math.min(unread, 9)}{unread > 9 ? '+' : ''}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(360px,calc(100vw-24px))] animate-pop rounded-2xl border border-line-strong bg-elevated shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {items.length > 0 && <button type="button" onClick={clear} className="text-xs text-muted hover:text-fg">Clear</button>}
          </div>
          <ul className="max-h-[420px] overflow-y-auto p-1.5">
            {items.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-muted">
                <BellOff className="h-5 w-5 text-subtle" />
                No notifications yet. Launches, alerts and big watchlist moves show up here.
              </li>
            )}
            {items.map((n) => {
              const Icon = ICON[n.kind]
              const body = (
                <div className={cn('flex gap-3 rounded-xl px-3 py-2.5', !n.read && 'bg-primary/[0.05]')}>
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-subtle">{timeAgo(n.createdAt, now)}</p>
                  </div>
                </div>
              )
              return <li key={n.id}>{n.href ? <Link href={n.href} onClick={() => setOpen(false)} className="block hover:bg-white/[0.03]">{body}</Link> : body}</li>
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
