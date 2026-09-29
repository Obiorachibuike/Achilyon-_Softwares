'use client'
import { useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * Token logo. Uses the token's own image when available; otherwise renders
 * a deterministic monogram (never a stock or third-party logo).
 */
export function TokenLogo({ src, symbol, size = 32, className }: { src?: string | null; symbol: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const label = symbol.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?'
  const hue = [...symbol].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)
  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element -- user uploads are data: URLs, which next/image cannot optimize
    return <img src={src} alt="" width={size} height={size} onError={() => setFailed(true)} loading="lazy" decoding="async" className={cn('shrink-0 rounded-full bg-white/5 object-cover ring-1 ring-white/10', className)} style={{ width: size, height: size }} />
  }
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ring-1 ring-white/10', className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.36),
        background: `radial-gradient(circle at 30% 25%, hsl(${hue} 85% 68%), hsl(${(hue + 40) % 360} 70% 38%) 70%)`,
      }}
    >
      {label}
    </span>
  )
}
