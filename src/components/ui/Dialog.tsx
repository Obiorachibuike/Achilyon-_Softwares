'use client'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useMounted } from '@/hooks/useMounted'

/**
 * Accessible modal dialog: portal, focus trap, ESC to close, scroll lock,
 * focus restoration and aria-labelledby wiring.
 */
export function Dialog({ open, onClose, title, description, children, className, hideClose = false, position = 'center' }: {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
  hideClose?: boolean
  position?: 'center' | 'top'
}) {
  const mounted = useMounted()
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusables = () => ref.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])') ?? []
    requestAnimationFrame(() => {
      const auto = ref.current?.querySelector<HTMLElement>('[data-autofocus]')
      ;(auto ?? focusables()[0] ?? ref.current)?.focus()
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current() }
      if (e.key === 'Tab') {
        const list = [...focusables()]
        const first = list[0]
        const last = list[list.length - 1]
        if (!first || !last) return
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  if (!mounted || !open) return null
  return createPortal(
    <div className={cn('fixed inset-0 z-[100] flex justify-center p-3 sm:p-6', position === 'top' ? 'items-start pt-[10vh]' : 'items-end sm:items-center')}>
      <div className="absolute inset-0 bg-[#020409]/75 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={cn('relative w-full max-w-md animate-pop rounded-2xl border border-line-strong bg-card shadow-2xl shadow-black/60 outline-none', className)}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="font-display text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p id={`${id}-desc`} className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {!hideClose && (
            <button type="button" onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-muted hover:bg-white/5 hover:text-fg" aria-label="Close dialog">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
