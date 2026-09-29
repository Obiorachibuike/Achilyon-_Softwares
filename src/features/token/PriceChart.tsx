'use client'
import { useEffect, useMemo, useRef } from 'react'
import { CandlestickSeries, ColorType, CrosshairMode, HistogramSeries, LineSeries, AreaSeries, createChart, type IChartApi, type ISeriesApi, type SeriesType, type UTCTimestamp } from 'lightweight-charts'
import type { Candle } from '@/types'
import { formatPrice, formatUsdCompact } from '@/lib/format'
import { liquiditySeries, marketCapSeries, type ChartMode } from './chartData'

const UP = '#22C55E'
const DOWN = '#EF4444'
const PRIMARY = '#3B82F6'

/**
 * Interactive chart (lightweight-charts). Loaded client-only via next/dynamic
 * from ChartPanel. Re-creates series when the mode changes and streams data
 * updates in place otherwise.
 */
export default function PriceChart({ candles, mode, type, priceUsd, marketCap, liquidityUsd, height = 380 }: {
  candles: Candle[]
  mode: ChartMode
  type: 'candles' | 'line'
  priceUsd: number
  marketCap: number
  liquidityUsd: number
  height?: number
}) {
  const el = useRef<HTMLDivElement>(null)
  const chart = useRef<IChartApi | null>(null)
  const main = useRef<ISeriesApi<SeriesType> | null>(null)
  const vol = useRef<ISeriesApi<'Histogram'> | null>(null)
  const fitted = useRef(false)

  useEffect(() => {
    if (!el.current) return
    // Canvas can't resolve CSS variables, so read the loaded font family explicitly.
    const mono = getComputedStyle(el.current).getPropertyValue('--font-geist-mono').trim()
    const c = createChart(el.current, {
      autoSize: true,
      height,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#94A3B8', fontSize: 11, fontFamily: `${mono ? `${mono}, ` : ''}ui-monospace, SFMono-Regular, Menlo, monospace`, attributionLogo: false },
      grid: { vertLines: { color: 'rgba(255,255,255,0.035)' }, horzLines: { color: 'rgba(255,255,255,0.035)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: 'rgba(148,163,184,0.35)', labelBackgroundColor: '#1E293B' }, horzLine: { color: 'rgba(148,163,184,0.35)', labelBackgroundColor: '#1E293B' } },
    })
    chart.current = c
    return () => {
      c.remove()
      chart.current = null
      main.current = null
      vol.current = null
    }
  }, [height])

  // (Re)build series when the display mode changes.
  useEffect(() => {
    const c = chart.current
    if (!c) return
    if (main.current) c.removeSeries(main.current)
    if (vol.current) c.removeSeries(vol.current)
    main.current = null
    vol.current = null
    fitted.current = false
    const usd = (v: number) => formatUsdCompact(v)
    c.applyOptions({ localization: { priceFormatter: mode === 'price' ? (v: number) => formatPrice(v) : usd } })

    if (mode === 'volume') {
      main.current = c.addSeries(HistogramSeries, { priceFormat: { type: 'custom', formatter: usd } })
    } else if (mode === 'price' && type === 'candles') {
      main.current = c.addSeries(CandlestickSeries, { upColor: UP, downColor: DOWN, borderVisible: false, wickUpColor: UP, wickDownColor: DOWN, priceFormat: { type: 'custom', formatter: (v: number) => formatPrice(v), minMove: 1e-12 } })
    } else if (mode === 'price') {
      main.current = c.addSeries(AreaSeries, { lineColor: PRIMARY, topColor: 'rgba(59,130,246,0.25)', bottomColor: 'rgba(59,130,246,0)', lineWidth: 2, priceFormat: { type: 'custom', formatter: (v: number) => formatPrice(v), minMove: 1e-12 } })
    } else {
      main.current = c.addSeries(LineSeries, { color: mode === 'liquidity' ? '#F5B041' : PRIMARY, lineWidth: 2, priceFormat: { type: 'custom', formatter: usd } })
    }
    if (mode === 'price') {
      vol.current = c.addSeries(HistogramSeries, { priceScaleId: 'vol', priceFormat: { type: 'custom', formatter: usd }, lastValueVisible: false, priceLineVisible: false })
      c.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
      main.current.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.22 } })
    } else {
      main.current.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.05 } })
    }
  }, [mode, type])

  const data = useMemo(() => {
    const t = (s: number) => s as UTCTimestamp
    const bars = candles.map((c) => ({ time: t(c.time), volume: c.volume, color: c.close >= c.open ? 'rgba(34,197,94,0.45)' : 'rgba(239,68,68,0.45)', c }))
    return {
      candles: bars.map(({ time, c }) => ({ time, open: c.open, high: c.high, low: c.low, close: c.close })),
      line: bars.map(({ time, c }) => ({ time, value: c.close })),
      volume: bars.map(({ time, volume, color }) => ({ time, value: volume, color })),
      mcap: marketCapSeries(candles, priceUsd, marketCap).map((p) => ({ time: t(p.time), value: p.value })),
      liquidity: liquiditySeries(candles, priceUsd, liquidityUsd).map((p) => ({ time: t(p.time), value: p.value })),
    }
  }, [candles, priceUsd, marketCap, liquidityUsd])

  useEffect(() => {
    const s = main.current
    if (!s) return
    if (mode === 'volume') s.setData(data.volume)
    else if (mode === 'price') s.setData(type === 'candles' ? data.candles : data.line)
    else s.setData(mode === 'mcap' ? data.mcap : data.liquidity)
    vol.current?.setData(data.volume)
    if (!fitted.current && candles.length) {
      chart.current?.timeScale().fitContent()
      fitted.current = true
    }
  }, [data, mode, type, candles.length])

  return <div ref={el} style={{ height }} className="w-full" role="img" aria-label={`${mode} chart`} />
}
