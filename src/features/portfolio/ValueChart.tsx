import { useId } from 'react'

/** Lightweight SVG area chart for portfolio value history. */
export function ValueChart({ points, height = 140 }: { points: { time: number; value: number }[]; height?: number }) {
  const id = useId()
  if (points.length < 2) return <div style={{ height }} className="grid place-items-center text-sm text-muted">Not enough history yet</div>
  const W = 600
  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const x = (i: number) => (i / (points.length - 1)) * W
  const y = (v: number) => height - 6 - ((v - min) / span) * (height - 16)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const first = points[0]?.value ?? 0
  const last = points[points.length - 1]?.value ?? 0
  const color = last >= first ? '#22C55E' : '#EF4444'
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={`Portfolio value ${last >= first ? 'up' : 'down'} over the period`}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient>
      </defs>
      <path d={`${line} L${W},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
