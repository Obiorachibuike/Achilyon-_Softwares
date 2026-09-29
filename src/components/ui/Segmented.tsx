'use client'
import { useRef, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

/** Accessible segmented control (radiogroup with arrow-key navigation). */
export function Segmented<T extends string>({ value, onChange, options, label, size = 'sm', className }: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; disabled?: boolean }[]
  label: string
  size?: 'xs' | 'sm'
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const onKey = (e: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return
    e.preventDefault()
    const enabled = options.filter((o) => !o.disabled)
    const i = enabled.findIndex((o) => o.value === value)
    const next = enabled[(i + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length]
    if (next) {
      onChange(next.value)
      requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus())
    }
  }
  return (
    <div ref={ref} role="radiogroup" aria-label={label} onKeyDown={onKey} className={cn('inline-flex rounded-xl border border-line bg-bg-2 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'whitespace-nowrap rounded-[10px] font-medium transition-colors disabled:opacity-40',
              size === 'xs' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
              active ? 'bg-white/[0.09] text-fg shadow-sm' : 'text-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
