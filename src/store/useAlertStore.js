import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid, toNumber } from '../lib/utils'

export const ALERT_TYPES = {
  price_above: { label: 'Price rises above', unit: '$' },
  price_below: { label: 'Price falls below', unit: '$' },
  change_above: { label: '24h change above', unit: '%' },
  change_below: { label: '24h change below', unit: '%' },
}

/** Returns the observed value if the alert condition is met, otherwise null. */
export function evaluateAlert(alert, pair) {
  if (!pair) return null
  const price = toNumber(pair.priceUsd, null)
  const change = toNumber(pair.priceChange?.h24, null)
  switch (alert.type) {
    case 'price_above': return price !== null && price >= alert.value ? price : null
    case 'price_below': return price !== null && price <= alert.value ? price : null
    case 'change_above': return change !== null && change >= alert.value ? change : null
    case 'change_below': return change !== null && change <= alert.value ? change : null
    default: return null
  }
}

const useAlertStore = create(
  persist(
    (set) => ({
      alerts: [],
      lastChecked: null,
      create: ({ pair, type, value, note = '' }) => set((s) => ({
        alerts: [{
          id: uid(),
          chainId: pair.chainId,
          pairAddress: pair.pairAddress,
          symbol: pair.baseToken?.symbol,
          quote: pair.quoteToken?.symbol,
          type,
          value: Number(value),
          note,
          status: 'active',
          createdAt: Date.now(),
          priceAtCreation: pair.priceUsd ?? null,
          triggeredAt: null,
          triggeredValue: null,
        }, ...s.alerts],
      })),
      trigger: (id, observed) => set((s) => ({
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, status: 'triggered', triggeredAt: Date.now(), triggeredValue: observed } : a)),
      })),
      rearm: (id) => set((s) => ({
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, status: 'active', triggeredAt: null, triggeredValue: null } : a)),
      })),
      remove: (id) => set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      clearTriggered: () => set((s) => ({ alerts: s.alerts.filter((a) => a.status !== 'triggered') })),
      setLastChecked: (ts) => set({ lastChecked: ts }),
    }),
    { name: 'achilyon-alerts', version: 1 },
  ),
)

export default useAlertStore
