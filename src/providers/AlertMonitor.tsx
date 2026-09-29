'use client'
import { useEffect } from 'react'
import type { MarketToken, TradingPair } from '@/types'
import { ALERT_TYPES, evaluateAlert, useAlertStore } from '@/stores/alerts'
import { useNotifications } from '@/stores/notifications'
import { toast } from '@/stores/toast'
import { api } from '@/lib/api/client'
import { tokenApi } from '@/lib/paths'
import { formatPercent, formatPrice } from '@/lib/format'

/** Checks active price alerts every 30s while the tab is visible (ported from useAlertMonitor). */
export function AlertMonitor() {
  useEffect(() => {
    const check = async () => {
      if (document.hidden) return
      const { alerts, trigger } = useAlertStore.getState()
      const active = alerts.filter((a) => a.status === 'active')
      for (const alert of active.slice(0, 20)) {
        try {
          const { token } = await api.get<{ token: MarketToken; pairs: TradingPair[] }>(tokenApi(alert.chain, alert.address))
          const observed = evaluateAlert(alert, token.market.priceUsd, token.market.priceChange.h24)
          if (observed === null) continue
          trigger(alert.id, observed)
          const unit = ALERT_TYPES[alert.type].unit
          const body = `${ALERT_TYPES[alert.type].label} ${unit === '%' ? `${alert.value}%` : formatPrice(alert.value)} — now ${unit === '%' ? formatPercent(observed) : formatPrice(observed)}`
          toast.warning(`${alert.symbol} alert triggered`, body)
          useNotifications.getState().push({ kind: 'price', title: `${alert.symbol} alert triggered`, body, href: `/token/${alert.chain}/${alert.address}` })
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try { new Notification(`${alert.symbol} alert`, { body, icon: '/icon.svg' }) } catch { /* ignore */ }
          }
        } catch {
          /* retry next tick */
        }
      }
    }
    const id = setInterval(check, 30_000)
    const first = setTimeout(check, 3_000)
    return () => { clearInterval(id); clearTimeout(first) }
  }, [])
  return null
}
