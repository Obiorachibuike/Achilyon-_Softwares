import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('panel', className)} {...props} />
}

export function CardHeader({ title, subtitle, action, icon, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5', className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="shrink-0 text-primary">{icon}</span>}
        <div className="min-w-0">
          <h2 className="truncate font-display text-[15px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export type BadgeTone = 'neutral' | 'primary' | 'up' | 'down' | 'warn' | 'gold' | 'demo'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-white/[0.06] text-muted border-line',
  primary: 'bg-primary/10 text-[#93C5FD] border-primary/25',
  up: 'bg-up/10 text-up border-up/25',
  down: 'bg-down/10 text-[#FCA5A5] border-down/25',
  warn: 'bg-warn/10 text-[#FCD34D] border-warn/25',
  gold: 'bg-gold/10 text-gold border-gold/30',
  demo: 'bg-[#A78BFA]/10 text-[#C4B5FD] border-[#A78BFA]/25',
}

export function Badge({ tone = 'neutral', className, children, title }: { tone?: BadgeTone; className?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide', tones[tone], className)}>
      {children}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return <kbd className={cn('rounded border border-line bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted', className)}>{children}</kbd>
}

export function Field({ label, hint, error, children, htmlFor, className }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactNode; htmlFor: string; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-muted">{label}</label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-[#FCA5A5]">{error}</p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-[11px] text-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="label">{label}</div>
      <div className="num mt-1 truncate text-[15px] font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs">{sub}</div>}
    </div>
  )
}
