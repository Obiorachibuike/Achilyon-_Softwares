'use client'
import { create } from 'zustand'
import type { MarketToken, MarketTrade } from '@/types'

export interface LiveQuote {
  priceUsd: number
  change24h: number
  marketCap: number
  volume24h: number
  progress: number | null
  at: number
  direction: 'up' | 'down' | 'flat'
}

export type RealtimeStatus = 'connecting' | 'live' | 'polling' | 'offline'

interface RealtimeStore {
  status: RealtimeStatus
  quotes: Record<string, LiveQuote>
  feed: (MarketTrade & { key: string })[]
  launches: MarketToken[]
  setStatus: (s: RealtimeStatus) => void
  applyPrice: (key: string, q: Omit<LiveQuote, 'at' | 'direction'>) => void
  pushTrade: (key: string, t: MarketTrade) => void
  pushLaunch: (t: MarketToken) => void
}

/** Real-time overlay: latest streamed quotes/trades layered over cached server data. */
export const useRealtimeStore = create<RealtimeStore>((set) => ({
  status: 'connecting',
  quotes: {},
  feed: [],
  launches: [],
  setStatus: (status) => set({ status }),
  applyPrice: (key, q) =>
    set((s) => {
      const prev = s.quotes[key]
      const direction = !prev ? 'flat' : q.priceUsd > prev.priceUsd ? 'up' : q.priceUsd < prev.priceUsd ? 'down' : prev.direction
      return { quotes: { ...s.quotes, [key]: { ...q, at: Date.now(), direction } } }
    }),
  pushTrade: (key, t) => set((s) => ({ feed: [{ ...t, key }, ...s.feed].slice(0, 40) })),
  pushLaunch: (t) => set((s) => ({ launches: [t, ...s.launches].slice(0, 10) })),
}))
