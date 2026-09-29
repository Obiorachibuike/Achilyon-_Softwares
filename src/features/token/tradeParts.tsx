import { cn } from '@/lib/cn'

export const SLIPPAGE_PRESETS = [50, 100, 300, 500]

export function QuoteRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('num text-right', strong && 'font-semibold')}>{value}</dd>
    </div>
  )
}

export function SlippageSettings({ slippageBps, setSlippage }: { slippageBps: number; setSlippage: (bps: number) => void }) {
  return (
    <div className="mt-3 animate-rise rounded-xl border border-line bg-bg-2/70 p-3">
      <div className="label mb-2">Max slippage</div>
      <div className="flex flex-wrap gap-1.5">
        {SLIPPAGE_PRESETS.map((b) => (
          <button key={b} type="button" onClick={() => setSlippage(b)} className={cn('num rounded-lg border px-2.5 py-1 text-xs', slippageBps === b ? 'border-primary/60 bg-primary/10 text-fg' : 'border-line text-muted hover:text-fg')}>{b / 100}%</button>
        ))}
        <label className="flex items-center gap-1 rounded-lg border border-line px-2 text-xs text-muted">
          <span className="sr-only">Custom slippage percent</span>
          <input type="number" min={0.1} max={50} step={0.1} value={slippageBps / 100} onChange={(e) => Number(e.target.value) > 0 && setSlippage(Number(e.target.value) * 100)} className="num w-12 bg-transparent py-1 text-fg outline-none" />%
        </label>
      </div>
      {slippageBps > 1000 && <p className="mt-2 text-[11px] text-warn">High slippage makes your order easy to front-run.</p>}
    </div>
  )
}
