import { useCallback } from 'react'
import { dexService } from '../services/api'
import { config } from '../config'
import useAlertStore, { evaluateAlert, ALERT_TYPES } from '../store/useAlertStore'
import { toast } from '../store/useToastStore'
import { formatPrice, formatPercent } from '../lib/utils'
import useVisibleInterval from './useVisibleInterval'

function notify(title, body) {
  toast({ title, description: body, tone: 'alert', duration: 9000 })
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try { new Notification(title, { body, icon: '/achilyon.svg' }) } catch { /* ignore */ }
  }
}

/** Polls live prices for every active alert and fires the ones whose condition is met. */
export default function useAlertMonitor() {
  const check = useCallback(async () => {
    const { alerts, trigger, setLastChecked } = useAlertStore.getState()
    const active = alerts.filter((a) => a.status === 'active')
    if (!active.length) return
    try {
      const pairs = await dexService.getPairsForRefs(active)
      const byKey = new Map(pairs.map((p) => [`${p.chainId}:${p.pairAddress}`.toLowerCase(), p]))
      active.forEach((alert) => {
        const observed = evaluateAlert(alert, byKey.get(`${alert.chainId}:${alert.pairAddress}`.toLowerCase()))
        if (observed === null) return
        trigger(alert.id, observed)
        const unit = ALERT_TYPES[alert.type]?.unit
        const shown = unit === '%' ? formatPercent(observed) : formatPrice(observed)
        notify(`${alert.symbol} alert triggered`, `${ALERT_TYPES[alert.type]?.label} ${unit === '%' ? alert.value + '%' : formatPrice(alert.value)} — now ${shown}`)
      })
      setLastChecked(Date.now())
    } catch {
      /* network hiccup — retry on next tick */
    }
  }, [])

  useVisibleInterval(check, config.refreshIntervalMs, { immediate: true })
}
