import Link from 'next/link'
import { cn } from '@/lib/cn'

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="ach-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#93C5FD" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1E3A8A" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0A0F1C" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" fill="none" stroke="rgba(255,255,255,0.1)" />
      <path d="M32 12 L51 52 H43 L39.2 43.5 H24.8 L21 52 H13 Z M32 28.5 L27.9 37.6 H36.1 Z" fill="url(#ach-a)" fillRule="evenodd" />
      <circle cx="32" cy="12" r="3.4" fill="#F5B041" />
    </svg>
  )
}

export function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2.5 rounded-lg', className)} aria-label="Achilyon home">
      <LogoMark size={compact ? 28 : 32} />
      <span className="leading-none">
        <span className="block font-display text-[17px] font-bold tracking-[0.02em]">ACHILYON</span>
        {!compact && <span className="mt-1 block text-[9.5px] uppercase tracking-[0.26em] text-subtle">Discover · Launch · Trade</span>}
      </span>
    </Link>
  )
}
