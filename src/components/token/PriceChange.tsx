import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatPercent } from '@/lib/format'

/** Percent change with an arrow icon, so gain/loss is not conveyed by color alone. */
export function PriceChange({ value, className, showIcon = true, digits }: { value: number | null | undefined; className?: string; showIcon?: boolean; digits?: number }) {
  if (value == null || !Number.isFinite(value)) return <span className={cn('text-subtle', className)}>—</span>
  const up = value > 0.0049
  const down = value < -0.0049
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  return (
    <span className={cn('num inline-flex items-center gap-0.5 font-medium', up ? 'text-up' : down ? 'text-down' : 'text-muted', className)}>
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
      <span className="sr-only">{up ? 'up' : down ? 'down' : 'unchanged'}</span>
      {formatPercent(value, digits)}
    </span>
  )
}
