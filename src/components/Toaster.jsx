import { X, CheckCircle2, Info, BellRing, AlertTriangle } from 'lucide-react'
import useToastStore from '../store/useToastStore'
import { cn } from '../lib/utils'

const icons = { success: CheckCircle2, info: Info, alert: BellRing, error: AlertTriangle }
const tones = { success: 'text-emerald-400', info: 'text-primary', alert: 'text-amber-400', error: 'text-red-400' }

export default function Toaster() {
  const { toasts, dismiss } = useToastStore()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.tone] ?? Info
        return (
          <div key={t.id} className="toast pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 shadow-2xl">
            <Icon size={18} className={cn('mt-0.5 shrink-0', tones[t.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
            </div>
            <button type="button" onClick={() => dismiss(t.id)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss notification"><X size={15} /></button>
          </div>
        )
      })}
    </div>
  )
}
