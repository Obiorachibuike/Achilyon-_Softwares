'use client'
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import { useToastStore } from '@/stores/toast'
import { cn } from '@/lib/cn'

const ICONS = { info: Info, success: CheckCircle2, error: XCircle, warning: TriangleAlert }
const COLORS = { info: 'text-primary', success: 'text-up', error: 'text-down', warning: 'text-warn' }

export function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-[120] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[360px]" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone]
        return (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="pointer-events-auto flex w-full animate-rise items-start gap-3 rounded-xl border border-line-strong bg-elevated/95 p-3.5 shadow-xl shadow-black/40 backdrop-blur">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', COLORS[t.tone])} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.title}</p>
              {t.description && <p className="mt-0.5 break-words text-xs text-muted">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="rounded p-0.5 text-subtle hover:text-fg" aria-label="Dismiss notification">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
