'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { MOBILE_TABS, isActive } from './nav'
import { SidebarContent } from './Sidebar'

/** Mobile: bottom tab bar + full navigation drawer ("More"). */
export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul className="grid grid-cols-5">
          {MOBILE_TABS.map((item) => {
            const active = isActive(pathname, item)
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium', active ? 'text-fg' : 'text-subtle')}>
                  <Icon className={cn('h-5 w-5', active && 'text-primary')} aria-hidden />
                  {item.label}
                </Link>
              </li>
            )
          })}
          <li>
            <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-drawer" className="flex w-full flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium text-subtle">
              <Menu className="h-5 w-5" aria-hidden /> More
            </button>
          </li>
        </ul>
      </nav>
      <div className={cn('fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={() => setOpen(false)} aria-hidden />
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn('fixed inset-y-0 left-0 z-50 w-[min(300px,86vw)] border-r border-line bg-bg-2 shadow-2xl transition-transform duration-300 lg:hidden', open ? 'translate-x-0' : '-translate-x-full')}
        inert={!open}
      >
        <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 z-10 rounded-lg p-2 text-muted hover:text-fg" aria-label="Close navigation">
          <X className="h-5 w-5" />
        </button>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>
    </>
  )
}
