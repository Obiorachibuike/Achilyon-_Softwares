'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChainId, Timeframe } from '@/types'

/** User preferences (persisted locally). */
interface PreferencesStore {
  network: ChainId | 'all'
  slippageBps: number
  chartTimeframe: Timeframe
  chartType: 'candles' | 'line'
  riskAcknowledged: boolean
  setNetwork: (n: ChainId | 'all') => void
  setSlippage: (bps: number) => void
  setChartTimeframe: (tf: Timeframe) => void
  setChartType: (t: 'candles' | 'line') => void
  acknowledgeRisk: () => void
}

export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      network: 'all',
      slippageBps: 100,
      chartTimeframe: '15m',
      chartType: 'candles',
      riskAcknowledged: false,
      setNetwork: (network) => set({ network }),
      setSlippage: (bps) => set({ slippageBps: Math.max(10, Math.min(5000, Math.round(bps))) }),
      setChartTimeframe: (chartTimeframe) => set({ chartTimeframe }),
      setChartType: (chartType) => set({ chartType }),
      acknowledgeRisk: () => set({ riskAcknowledged: true }),
    }),
    { name: 'achilyon-preferences', version: 1 },
  ),
)
