'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe } from 'lucide-react'
import type { ChainId } from '@/types'
import { FILTER_CHAINS, NETWORKS } from '@/lib/blockchain/chains'
import { usePreferences } from '@/stores/preferences'
import { useMounted } from '@/hooks/useMounted'
import { ChainDot } from '@/components/token/badges'
import { cn } from '@/lib/cn'

/** Global network filter applied to every market view. */
export function NetworkSelector({ className }: { className?: string }) {
  const mounted = useMounted()
  const network = usePreferences((s) => s.network)
  const setNetwork = usePreferences((s) => s.setNetwork)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = mounted ? network : 'all'

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const options: (ChainId | 'all')[] = ['all', ...FILTER_CHAINS]
  return (
    <div ref={ref} className={cn('relative', className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label="Select network" className="flex h-9 items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-3 text-sm text-muted hover:text-fg">
        {current === 'all' ? <Globe className="h-4 w-4" aria-hidden /> : <ChainDot chain={current} />}
        <span className="hidden md:inline">{current === 'all' ? 'All networks' : NETWORKS[current].name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-subtle" aria-hidden />
      </button>
      {open && (
        <ul role="listbox" aria-label="Networks" className="absolute right-0 top-11 z-50 w-52 animate-pop rounded-2xl border border-line-strong bg-elevated p-1.5 shadow-2xl shadow-black/50">
          {options.map((o) => (
            <li key={o} role="option" aria-selected={current === o}>
              <button type="button" onClick={() => { setNetwork(o); setOpen(false) }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/[0.05] hover:text-fg">
                {o === 'all' ? <Globe className="h-4 w-4" /> : <ChainDot chain={o} />}
                <span className="flex-1 text-left">{o === 'all' ? 'All networks' : NETWORKS[o].name}</span>
                {current === o && <Check className="h-4 w-4 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
