import { useState } from 'react'
import { BellPlus } from 'lucide-react'
import useAlertStore, { ALERT_TYPES } from '../store/useAlertStore'
import { toast } from '../store/useToastStore'
import { formatPrice } from '../lib/utils'
import { Button, Field, inputClass } from './ui'

export default function AlertForm({ pair, onCreated }) {
  const create = useAlertStore((s) => s.create)
  const price = parseFloat(pair.priceUsd || 0)
  const [type, setType] = useState('price_above')
  const [value, setValue] = useState(() => (price ? +(price * 1.1).toPrecision(4) : ''))
  const [error, setError] = useState('')
  const isPercent = ALERT_TYPES[type].unit === '%'

  const changeType = (next) => {
    setType(next)
    setError('')
    if (ALERT_TYPES[next].unit === '%') setValue(next === 'change_above' ? 10 : -10)
    else if (price) setValue(+(price * (next === 'price_above' ? 1.1 : 0.9)).toPrecision(4))
  }

  const submit = async (e) => {
    e.preventDefault()
    const n = Number(value)
    if (!Number.isFinite(n) || (!isPercent && n <= 0)) { setError('Enter a valid target value.'); return }
    if (type === 'price_above' && price && n <= price) { setError(`Target must be above the current price (${formatPrice(price)}).`); return }
    if (type === 'price_below' && price && n >= price) { setError(`Target must be below the current price (${formatPrice(price)}).`); return }
    create({ pair, type, value: n })
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission() } catch { /* ignore */ }
    }
    toast({ title: 'Alert created', description: `${pair.baseToken?.symbol}: ${ALERT_TYPES[type].label.toLowerCase()} ${isPercent ? n + '%' : formatPrice(n)}`, tone: 'success' })
    onCreated?.()
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Condition">
        <select className={inputClass} value={type} onChange={(e) => changeType(e.target.value)}>
          {Object.entries(ALERT_TYPES).map(([id, t]) => <option key={id} value={id}>{t.label}</option>)}
        </select>
      </Field>
      <Field label={isPercent ? 'Target change (%)' : 'Target price (USD)'} hint={!isPercent && price ? `Current: ${formatPrice(price)}` : undefined}>
        <input className={inputClass} type="number" step="any" inputMode="decimal" value={value} onChange={(e) => { setValue(e.target.value); setError('') }} required />
      </Field>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <Button type="submit" variant="primary" className="w-full"><BellPlus size={15} /> Create alert</Button>
    </form>
  )
}
