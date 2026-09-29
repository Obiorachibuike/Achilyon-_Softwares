import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * CSS-only tooltip that also appears on keyboard focus. The trigger keeps an
 * accessible label via aria-describedby-like `aria-label` on the child.
 */
export function Tooltip({ content, children, side = 'top', className }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom'; className?: string }) {
  return (
    <span className={cn('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-lg border border-line-strong bg-elevated px-2.5 py-1.5 text-[11.5px] font-normal normal-case leading-snug tracking-normal text-fg opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {content}
      </span>
    </span>
  )
}
