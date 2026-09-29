'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChainId } from '@/types'

/** Price alerts (ported from the original Achilyon alerts store). */
export const ALERT_TYPES = {
  price_above: { label: 'Price rises above', unit: '$' },
  price_below: { label: 'Price falls below', unit: '$' },
  change_above: { label: '24h change above', unit: '%' },
  change_below: { label: '24h change below', unit: '%' },
} as const

export type AlertType = keyof typeof ALERT_TYPES

export interface PriceAlert {
  id: string
  chain: ChainId
  address: string
  symbol: string
  type: AlertType
  value: number
  status: 'active' | 'triggered'
  createdAt: number
  triggeredAt: number | null
  triggeredValue: number | null
}

/** Returns the observed value if the alert condition is met, otherwise null. */
export function evaluateAlert(alert: Pick<PriceAlert, 'type' | 'value'>, priceUsd: number | null, change24h: number | null): number | null {
  switch (alert.type) {
    case 'price_above': return priceUsd !== null && priceUsd >= alert.value ? priceUsd : null
    case 'price_below': return priceUsd !== null && priceUsd <= alert.value ? priceUsd : null
    case 'change_above': return change24h !== null && change24h >= alert.value ? change24h : null
    case 'change_below': return change24h !== null && change24h <= alert.value ? change24h : null
  }
}

interface AlertStore {
  alerts: PriceAlert[]
  create: (a: Pick<PriceAlert, 'chain' | 'address' | 'symbol' | 'type' | 'value'>) => void
  trigger: (id: string, observed: number) => void
  rearm: (id: string) => void
  remove: (id: string) => void
}

export const useAlertStore = create<AlertStore>()(
  persist(
    (set) => ({
      alerts: [],
      create: (a) => set((s) => {
        const alert: PriceAlert = { ...a, id: Math.random().toString(36).slice(2, 10), status: 'active', createdAt: Date.now(), triggeredAt: null, triggeredValue: null }
        return { alerts: [alert, ...s.alerts].slice(0, 100) }
      }),
      trigger: (id, observed) => set((s) => ({ alerts: s.alerts.map((a): PriceAlert => (a.id === id ? { ...a, status: 'triggered', triggeredAt: Date.now(), triggeredValue: observed } : a)) })),
      rearm: (id) => set((s) => ({ alerts: s.alerts.map((a): PriceAlert => (a.id === id ? { ...a, status: 'active', triggeredAt: null, triggeredValue: null } : a)) })),
      remove: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
    }),
    { name: 'achilyon-alerts-v2', version: 1 },
  ),
)
