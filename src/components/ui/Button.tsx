import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'buy' | 'sell' | 'gold'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_0_1px_rgb(59_130_246/0.4),0_8px_24px_-8px_rgb(59_130_246/0.6)]',
  secondary: 'bg-white/[0.06] text-fg hover:bg-white/[0.1] border border-line',
  ghost: 'text-muted hover:text-fg hover:bg-white/[0.06]',
  outline: 'border border-line-strong text-fg hover:bg-white/[0.05]',
  danger: 'bg-down/10 text-down border border-down/30 hover:bg-down/20',
  buy: 'bg-up text-[#04110A] hover:bg-up/90 font-semibold',
  sell: 'bg-down text-white hover:bg-down/90 font-semibold',
  gold: 'bg-gold text-[#1A1204] hover:bg-gold/90 font-semibold',
}

const sizes: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-xl',
  icon: 'h-9 w-9 rounded-xl',
}

const BASE = 'inline-flex shrink-0 select-none items-center justify-center font-medium transition-[background,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50'

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', className?: string) {
  return cn(BASE, variants[variant], sizes[size], className)
}

/** A navigation link styled as a button (avoids nesting <button> in <a>). */
export function ButtonLink({ variant, size, className, ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading = false, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})
