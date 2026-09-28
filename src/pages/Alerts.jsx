import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BellOff, BellRing, RotateCcw, Trash2 } from 'lucide-react'
import useAlertStore, { ALERT_TYPES } from '../store/useAlertStore'
import useLivePairs from '../hooks/useLivePairs'
import { chainLabel } from '../config'
import { cn, formatPercent, formatPrice, timeAgo } from '../lib/utils'
import { Badge, Button, Card, EmptyState, PageHeader, PriceChange } from '../components/ui'

const fmt = (type, v) => (ALERT_TYPES[type]?.unit === '%' ? formatPercent(v) : formatPrice(v))

function NotificationPrompt() {
  const supported = typeof Notification !== 'undefined'
  const [perm, setPerm] = useState(supported ? Notification.permission : 'unsupported')
  if (perm === 'granted' || perm === 'unsupported') return null
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-sm">
        <BellOff size={18} className="text-amber-400" />
        {perm === 'denied'
          ? 'Browser notifications are blocked. Alerts will still appear in the app while it is open.'
          : 'Enable browser notifications to hear about alerts while the tab is in the background.'}
      </div>
      {perm === 'default' && <Button variant="primary" onClick={async () => setPerm(await Notification.requestPermission())}>Enable notifications</Button>}
    </Card>
  )
}

export default function Alerts() {
  const { alerts, remove, rearm, clearTriggered, lastChecked } = useAlertStore()
  const [tab, setTab] = useState('all')
  const refs = useMemo(() => alerts.map(({ chainId, pairAddress }) => ({ chainId, pairAddress })), [alerts])
  const { pairs } = useLivePairs(refs)

  const counts = { all: alerts.length, active: alerts.filter((a) => a.status === 'active').length, triggered: alerts.filter((a) => a.status === 'triggered').length }
  const shown = tab === 'all' ? alerts : alerts.filter((a) => a.status === tab)

  return (
    <div className="space-y-5">
      <PageHeader
        title="Alerts"
        description={`Price and momentum alerts are saved in this browser and checked on every refresh while Achilyon is open.${lastChecked ? ` Last check ${timeAgo(lastChecked)}.` : ''}`}
        actions={counts.triggered > 0 && <Button onClick={clearTriggered}>Clear triggered</Button>}
      />
      <NotificationPrompt />

      <div className="flex gap-1 rounded-xl border border-border bg-card/60 p-1 text-sm sm:w-fit">
        {['all', 'active', 'triggered'].map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cn('flex-1 rounded-lg px-4 py-1.5 capitalize transition-colors sm:flex-none', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {t} <span className="opacity-70">({counts[t]})</span>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {shown.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={alerts.length ? `No ${tab} alerts` : 'No alerts yet'}
            description="Open any token page and use the Price alerts panel to get notified when a target is hit."
            action={!alerts.length && <Link to="/markets"><Button variant="primary">Find a token</Button></Link>}
          />
        ) : (
          <ul className="divide-y divide-border/60">
            {shown.map((a) => {
              const pair = pairs.get(`${a.chainId}:${a.pairAddress}`.toLowerCase())
              const price = pair ? parseFloat(pair.priceUsd) : null
              const distance = price && ALERT_TYPES[a.type]?.unit === '$' ? ((a.value - price) / price) * 100 : null
              return (
                <li key={a.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', a.status === 'triggered' ? 'bg-amber-500/15 text-amber-400' : 'bg-primary/10 text-primary')}>
                    {a.status === 'triggered' ? <BellRing size={18} /> : <Bell size={18} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/token/${a.chainId}/${a.pairAddress}`} className="font-semibold hover:text-primary">{a.symbol}/{a.quote}</Link>
                      <Badge>{chainLabel(a.chainId)}</Badge>
                      <Badge tone={a.status === 'triggered' ? 'warn' : 'good'}>{a.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {ALERT_TYPES[a.type]?.label} <b className="text-foreground">{ALERT_TYPES[a.type]?.unit === '%' ? `${a.value}%` : formatPrice(a.value)}</b>
                      {' · '}created {timeAgo(a.createdAt)}
                      {a.status === 'triggered' && <> · hit {fmt(a.type, a.triggeredValue)} {timeAgo(a.triggeredAt)}</>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right text-sm">
                      <div className="tabular-nums">{pair ? formatPrice(pair.priceUsd) : '—'}</div>
                      {distance !== null && a.status === 'active'
                        ? <span className="text-xs text-muted-foreground">{Math.abs(distance).toFixed(1)}% to target</span>
                        : pair && <PriceChange value={pair.priceChange?.h24} className="text-xs" />}
                    </div>
                    <div className="flex gap-1">
                      {a.status === 'triggered' && (
                        <button type="button" onClick={() => rearm(a.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Re-arm alert" title="Re-arm"><RotateCcw size={16} /></button>
                      )}
                      <button type="button" onClick={() => remove(a.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-red-400" aria-label="Delete alert" title="Delete"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
