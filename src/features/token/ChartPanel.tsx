'use client'
import dynamic from 'next/dynamic'
import type { MarketToken, Timeframe } from '@/types'
import { useCandles } from '@/hooks/useMarket'
import { usePreferences } from '@/stores/preferences'
import { errorMessage } from '@/lib/api/client'
import { Card, Skeleton } from '@/components/ui/primitives'
import { ErrorState } from '@/components/ui/feedback'
import { Segmented } from '@/components/ui/Segmented'
import { PriceChange } from '@/components/token/PriceChange'
import { useState } from 'react'
import { rangeChange, type ChartMode } from './chartData'

const PriceChart = dynamic(() => import('./PriceChart'), { ssr: false, loading: () => <Skeleton className="h-[380px] w-full rounded-xl" /> })

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M']
const MODES: { value: ChartMode; label: string }[] = [
  { value: 'price', label: 'Price' },
  { value: 'mcap', label: 'Mkt cap' },
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'volume', label: 'Volume' },
]

export function ChartPanel({ t }: { t: MarketToken }) {
  const { chartTimeframe: tf, setChartTimeframe, chartType, setChartType } = usePreferences()
  const [mode, setMode] = useState<ChartMode>('price')
  const { data, isLoading, error, refetch, isFetching } = useCandles(t.token.chain, t.token.address, tf)
  const change = data ? rangeChange(data) : null

  return (
    <Card className="p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented label="Timeframe" size="xs" value={tf} onChange={setChartTimeframe} options={TIMEFRAMES.map((v) => ({ value: v, label: v }))} className="max-w-full overflow-x-auto" />
        <Segmented label="Chart data" size="xs" value={mode} onChange={setMode} options={MODES} />
        {mode === 'price' && <Segmented label="Chart type" size="xs" value={chartType} onChange={setChartType} options={[{ value: 'candles', label: 'Candles' }, { value: 'line', label: 'Line' }]} />}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted">
          {isFetching && !isLoading && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-label="Refreshing" />}
          {change !== null && <span>Range <PriceChange value={change} showIcon={false} /></span>}
        </div>
      </div>
      {error && !data ? (
        <ErrorState title="Chart unavailable" message={errorMessage(error)} onRetry={() => void refetch()} className="h-[380px]" />
      ) : isLoading || !data ? (
        <Skeleton className="h-[380px] w-full rounded-xl" />
      ) : data.length === 0 ? (
        <div className="grid h-[380px] place-items-center text-sm text-muted">No trading history for this timeframe yet.</div>
      ) : (
        <PriceChart candles={data} mode={mode} type={chartType} priceUsd={t.market.priceUsd} marketCap={t.market.marketCap} liquidityUsd={t.market.liquidityUsd} />
      )}
      {mode === 'liquidity' && <p className="mt-2 text-[11px] text-subtle">Estimated from price history assuming no liquidity was added or removed (L ≈ L<sub>now</sub>·√(p/p<sub>now</sub>)).</p>}
      {t.source === 'demo' && <p className="mt-2 text-[11px] text-subtle">Simulated price history (Demo Data).</p>}
    </Card>
  )
}
