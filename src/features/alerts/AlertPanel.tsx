'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import type { MarketToken } from '@/types'
import { ALERT_TYPES, useAlertStore, type AlertType } from '@/stores/alerts'
import { useMounted } from '@/hooks/useMounted'
import { formatPrice } from '@/lib/format'
import { toast } from '@/stores/toast'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/primitives'

/** Create/list price alerts for one token (checked by AlertMonitor while the app is open). */
export function AlertPanel({ t }: { t: MarketToken }) {
  const mounted = useMounted()
  const { alerts, create, remove } = useAlertStore()
  const [type, setType] = useState<AlertType>('price_above')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mine = mounted ? alerts.filter((a) => a.chain === t.token.chain && a.address.toLowerCase() === t.token.address.toLowerCase()) : []
  const unit = ALERT_TYPES[type].unit

  const submit = () => {
    const v = Number(value)
    if (!Number.isFinite(v) || (unit === '$' && v <= 0)) return setError(unit === '$' ? 'Enter a price above zero' : 'Enter a percentage')
    if (type === 'price_above' && v <= t.market.priceUsd) return setError('Target is already below the current price')
    if (type === 'price_below' && v >= t.market.priceUsd) return setError('Target is already above the current price')
    create({ chain: t.token.chain, address: t.token.address, symbol: t.token.symbol, type, value: v })
    setValue('')
    setError(null)
    toast.success('Alert created', `${ALERT_TYPES[type].label} ${unit === '%' ? `${v}%` : formatPrice(v)}`)
  }

  return (
    <Card className="p-4">
      <CardHeader title="Price alerts" icon={<Bell className="h-4 w-4" />} action={<Link href="/alerts" className="text-xs text-muted hover:text-fg">All alerts</Link>} className="mb-3 p-0" />
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-2">
        <select aria-label="Alert condition" className="input py-2" value={type} onChange={(e) => { setType(e.target.value as AlertType); setError(null) }}>
          {(Object.keys(ALERT_TYPES) as AlertType[]).map((k) => <option key={k} value={k}>{ALERT_TYPES[k].label}</option>)}
        </select>
        <div className="flex gap-2">
          <input aria-label={unit === '$' ? 'Target price in USD' : 'Target change in percent'} inputMode="decimal" className="input num py-2" placeholder={unit === '$' ? formatPrice(t.market.priceUsd).replace('$', '') : 'e.g. 25'} value={value} onChange={(e) => setValue(e.target.value)} />
          <Button type="submit" variant="primary">Add</Button>
        </div>
        {error && <p className="text-xs text-down" role="alert">{error}</p>}
      </form>
      {mine.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[12.5px]">
          {mine.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <span className={a.status === 'triggered' ? 'text-warn' : 'text-muted'}>{ALERT_TYPES[a.type].label} <span className="num text-fg">{ALERT_TYPES[a.type].unit === '%' ? `${a.value}%` : formatPrice(a.value)}</span>{a.status === 'triggered' && ' · hit'}</span>
              <button type="button" onClick={() => remove(a.id)} className="text-subtle hover:text-down" aria-label="Delete alert"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-subtle">Alerts are stored in this browser and checked while Achilyon is open.</p>
    </Card>
  )
}
