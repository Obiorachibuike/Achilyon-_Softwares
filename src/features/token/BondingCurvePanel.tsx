'use client'
import { useMemo } from 'react'
import { GraduationCap } from 'lucide-react'
import type { MarketToken } from '@/types'
import { curvePoints, fromSnapshot, summarizeCurve } from '@/lib/bondingCurve'
import { formatCompact, formatPrice, formatUsdCompact } from '@/lib/format'
import { Card, CardHeader } from '@/components/ui/primitives'

/** Curve progress, economics and an SVG of the price curve with the current position. */
export function BondingCurvePanel({ t }: { t: MarketToken }) {
  const curve = t.curve
  const view = useMemo(() => {
    if (!curve) return null
    const state = fromSnapshot(curve)
    const summary = summarizeCurve(state)
    const pts = curvePoints(state.config, 48)
    const maxP = Math.max(...pts.map((p) => p.priceUsd))
    const W = 280, H = 96
    const x = (sold: number) => (sold / state.config.curveSupply) * W
    const y = (p: number) => H - (p / maxP) * (H - 6) - 2
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.sold).toFixed(1)},${y(p.priceUsd).toFixed(1)}`).join(' ')
    const soldPts = pts.filter((p) => p.sold <= state.tokensSold)
    const area = soldPts.length > 1 ? `${soldPts.map((p, i) => `${i ? 'L' : 'M'}${x(p.sold).toFixed(1)},${y(p.priceUsd).toFixed(1)}`).join(' ')} L${x(state.tokensSold).toFixed(1)},${y(summary.priceUsd).toFixed(1)} L${x(state.tokensSold).toFixed(1)},${H} L0,${H} Z` : ''
    return { summary, state, path, area, cx: x(state.tokensSold), cy: y(summary.priceUsd), W, H }
  }, [curve])

  if (!curve || !view) return null
  const { summary, state } = view
  const progress = t.token.status === 'migrated' ? 1 : t.curve?.progress ?? summary.progress
  const migrated = t.token.status === 'migrated' || curve.migrated

  return (
    <Card className="p-4">
      <CardHeader title="Bonding curve" icon={<GraduationCap className="h-4 w-4" />} subtitle={migrated ? `Graduated to ${t.pair.dexName}` : 'Price rises as supply is bought'} className="mb-3 p-0" />
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">Progress</span>
        <span className="num font-semibold">{(progress * 100).toFixed(2)}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Bonding curve progress">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-700" style={{ width: `${Math.max(1.5, progress * 100)}%` }} />
      </div>
      <svg viewBox={`0 0 ${view.W} ${view.H}`} className="mt-4 h-24 w-full" aria-hidden>
        <defs>
          <linearGradient id="curve-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#3B82F6" stopOpacity="0.35" /><stop offset="1" stopColor="#3B82F6" stopOpacity="0" /></linearGradient>
        </defs>
        {view.area && <path d={view.area} fill="url(#curve-fill)" />}
        <path d={view.path} fill="none" stroke="rgba(148,163,184,0.45)" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx={view.cx} cy={view.cy} r="4" fill="#F5B041" stroke="#05070D" strokeWidth="2" />
      </svg>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <Item label="Curve price" value={formatPrice(summary.priceUsd)} />
        <Item label="Graduates at" value={formatUsdCompact(summary.migrationMarketCapUsd)} />
        <Item label="Raised" value={`${formatCompact(state.quoteRaised, 3)} ${curve.quoteSymbol}`} />
        <Item label="Target" value={`${formatCompact(summary.migrationQuoteTarget, 3)} ${curve.quoteSymbol}`} />
        <Item label="Tokens left" value={formatCompact(summary.remainingCurveTokens)} />
        <Item label="Curve fee" value={`${curve.feeBps / 100}%`} />
      </dl>
      <p className="mt-3 text-[11px] leading-relaxed text-subtle">
        When the curve sells out, collected {curve.quoteSymbol} and the reserved supply seed a DEX pool and the token trades there. <a href="/docs#bonding-curve" className="text-primary hover:underline">How it works</a>
      </p>
    </Card>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="num text-right">{value}</dd>
    </div>
  )
}
