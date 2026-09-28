import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Star, Loader2, AlertTriangle } from 'lucide-react'
import { cn, formatPercent, toNumber, copyToClipboard } from '../lib/utils'
import { chainLabel } from '../config'
import useWatchlistStore from '../store/useWatchlistStore'
import { toast } from '../store/useToastStore'

export function Card({ className, children, ...props }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card/80 backdrop-blur-sm', className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        {Icon && <Icon size={17} className="shrink-0 text-primary" />}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

const buttonVariants = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20',
  secondary: 'bg-secondary text-foreground border border-border hover:bg-muted',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20',
  success: 'bg-emerald-500 text-white hover:bg-emerald-600',
}

export function Button({ variant = 'secondary', size = 'md', className, children, loading, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : size === 'lg' ? 'px-5 py-3 text-sm' : 'px-3.5 py-2 text-sm',
        buttonVariants[variant],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Badge({ tone = 'default', className, children }) {
  const tones = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/15 text-primary',
    good: 'bg-emerald-500/15 text-emerald-400',
    warn: 'bg-amber-500/15 text-amber-400',
    bad: 'bg-red-500/15 text-red-400',
  }
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold', tones[tone], className)}>{children}</span>
}

export function ChainBadge({ chainId }) {
  return <Badge className="uppercase tracking-wide">{chainLabel(chainId)}</Badge>
}

export function PriceChange({ value, className, digits = 2 }) {
  const n = toNumber(value, null)
  if (n === null) return <span className={cn('text-muted-foreground', className)}>—</span>
  return (
    <span className={cn('tabular-nums font-medium', n > 0 ? 'text-up' : n < 0 ? 'text-down' : 'text-muted-foreground', className)}>
      {formatPercent(n, digits)}
    </span>
  )
}

export function TokenAvatar({ pair, src, symbol, size = 32 }) {
  const [failed, setFailed] = useState(false)
  const image = src ?? pair?.info?.imageUrl
  const label = (symbol ?? pair?.baseToken?.symbol ?? '?').slice(0, 2).toUpperCase()
  const hue = [...label].reduce((h, c) => h + c.charCodeAt(0) * 37, 0) % 360
  if (image && !failed) {
    return <img src={image} alt="" width={size} height={size} onError={() => setFailed(true)} className="shrink-0 rounded-full bg-muted object-cover" style={{ width: size, height: size }} loading="lazy" />
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 50) % 360} 70% 40%))` }}
    >
      {label}
    </span>
  )
}

export function TokenCell({ pair, to = true }) {
  const inner = (
    <div className="flex min-w-0 items-center gap-2.5">
      <TokenAvatar pair={pair} size={28} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-semibold">{pair.baseToken?.symbol}</span>
          <span className="text-xs text-muted-foreground">/{pair.quoteToken?.symbol}</span>
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{pair.baseToken?.name} · {chainLabel(pair.chainId)}</div>
      </div>
    </div>
  )
  return to ? <Link to={`/token/${pair.chainId}/${pair.pairAddress}`} className="block max-w-[14rem] hover:text-primary">{inner}</Link> : inner
}

export function WatchButton({ pair, className, withLabel = false }) {
  const watched = useWatchlistStore((s) => s.items.some((i) => i.chainId === pair.chainId && i.pairAddress.toLowerCase() === pair.pairAddress.toLowerCase()))
  const toggle = useWatchlistStore((s) => s.toggle)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        const added = toggle(pair)
        toast({ title: added ? 'Added to watchlist' : 'Removed from watchlist', description: `${pair.baseToken?.symbol}/${pair.quoteToken?.symbol}`, tone: added ? 'success' : 'info' })
      }}
      aria-pressed={watched}
      aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg p-1.5 transition-colors',
        watched ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400',
        withLabel && 'border border-border px-3 py-2 text-sm',
        className,
      )}
    >
      <Star size={16} fill={watched ? 'currentColor' : 'none'} />
      {withLabel && (watched ? 'Watching' : 'Watch')}
    </button>
  )
}

export function CopyButton({ value, label = 'Copy' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyToClipboard(value)) { setDone(true); setTimeout(() => setDone(false), 1500) }
      }}
      className="inline-flex items-center gap-1 rounded-md p-1 text-muted-foreground hover:text-foreground"
      aria-label={label}
    >
      {done ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  )
}

export function Spinner({ label = 'Loading…', className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground', className)}>
      <Loader2 className="animate-spin text-primary" size={26} />
      {label}
    </div>
  )
}

export function EmptyState({ icon: Icon = AlertTriangle, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <div className="rounded-2xl bg-muted p-3 text-muted-foreground"><Icon size={22} /></div>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <EmptyState
      title="Couldn't load live data"
      description={message}
      action={onRetry && <Button onClick={onRetry}>Try again</Button>}
    />
  )
}

export function Field({ label, hint, children, className }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  )
}

export const inputClass = 'w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-muted-foreground'

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="brand text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'primary' }) {
  const tones = { primary: 'text-primary bg-primary/10', good: 'text-emerald-400 bg-emerald-500/10', warn: 'text-amber-400 bg-amber-500/10', bad: 'text-red-400 bg-red-500/10' }
  return (
    <Card className="stat-card shimmer p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1.5 truncate text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
          {sub && <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
        {Icon && <div className={cn('rounded-xl p-2.5', tones[tone])}><Icon size={20} /></div>}
      </div>
    </Card>
  )
}
