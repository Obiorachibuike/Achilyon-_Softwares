import type { ReactNode } from 'react'
import { AlertTriangle, FlaskConical, Inbox, Info, RefreshCw, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'
import { Badge } from './primitives'

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-line bg-white/[0.03] text-muted">{icon ?? <Inbox className="h-5 w-5" />}</div>
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, className }: { title?: string; message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl border border-down/25 bg-down/10 text-down"><AlertTriangle className="h-5 w-5" /></div>
      <div>
        <p className="font-medium">{title}</p>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>}
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      )}
    </div>
  )
}

/** Marks simulated data. Must appear wherever demo data could be mistaken for live data. */
export function DemoBadge({ className, label = 'Demo data' }: { className?: string; label?: string }) {
  return (
    <Badge tone="demo" className={className} title="Simulated data for demonstration — not live market data">
      <FlaskConical className="h-3 w-3" aria-hidden /> {label}
    </Badge>
  )
}

export function Notice({ tone = 'info', title, children, className, icon }: { tone?: 'info' | 'warn' | 'danger' | 'demo'; title?: ReactNode; children?: ReactNode; className?: string; icon?: ReactNode }) {
  const styles = {
    info: 'border-primary/20 bg-primary/[0.06] text-[#BFDBFE]',
    warn: 'border-warn/25 bg-warn/[0.07] text-[#FDE68A]',
    danger: 'border-down/25 bg-down/[0.07] text-[#FECACA]',
    demo: 'border-[#A78BFA]/25 bg-[#A78BFA]/[0.07] text-[#DDD6FE]',
  }[tone]
  const Icon = tone === 'danger' ? ShieldAlert : tone === 'warn' ? AlertTriangle : tone === 'demo' ? FlaskConical : Info
  return (
    <div className={cn('flex gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed', styles, className)} role={tone === 'danger' ? 'alert' : 'note'}>
      <span className="mt-0.5 shrink-0">{icon ?? <Icon className="h-4 w-4" aria-hidden />}</span>
      <div className="min-w-0">
        {title && <p className="font-semibold text-fg">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-current/90')}>{children}</div>}
      </div>
    </div>
  )
}
