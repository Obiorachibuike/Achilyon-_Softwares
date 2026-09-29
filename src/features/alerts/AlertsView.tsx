'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Bell, BellOff, BellRing, RotateCcw, Trash2 } from 'lucide-react'
import type { MarketToken, TradingPair } from '@/types'
import { ALERT_TYPES, useAlertStore } from '@/stores/alerts'
import { api } from '@/lib/api/client'
import { tokenApi, tokenPath } from '@/lib/paths'
import { queryKeys } from '@/hooks/useMarket'
import { useMounted } from '@/hooks/useMounted'
import { useNow } from '@/hooks/useNow'
import { NETWORKS } from '@/lib/blockchain/chains'
import { formatPercent, formatPrice, timeAgo } from '@/lib/format'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Badge, Card, PageHeader } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/feedback'
import { Segmented } from '@/components/ui/Segmented'
import { PriceChange } from '@/components/token/PriceChange'
import { cn } from '@/lib/cn'

function NotificationPrompt() {
  const supported = typeof Notification !== 'undefined'
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported')
  if (perm === 'granted' || perm === 'unsupported') return null
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-sm text-muted">
        <BellOff className="h-4 w-4 text-warn" aria-hidden />
        {perm === 'denied' ? 'Browser notifications are blocked. Alerts still appear in-app while Achilyon is open.' : 'Enable browser notifications to hear about alerts while this tab is in the background.'}
      </div>
      {perm === 'default' && <Button variant="primary" size="sm" onClick={async () => setPerm(await Notification.requestPermission())}>Enable notifications</Button>}
    </Card>
  )
}

export function AlertsView() {
  const mounted = useMounted()
  const { alerts, remove, rearm } = useAlertStore()
  const [tab, setTab] = useState<'all' | 'active' | 'triggered'>('all')
  const now = useNow(30_000)
  const list = mounted ? alerts : []
  const unique = [...new Map(list.map((a) => [`${a.chain}:${a.address.toLowerCase()}`, a])).values()]
  const results = useQueries({
    queries: unique.map((a) => ({ queryKey: queryKeys.token(a.chain, a.address), queryFn: () => api.get<{ token: MarketToken; pairs: TradingPair[] }>(tokenApi(a.chain, a.address)), refetchInterval: 30_000, retry: 1 })),
  })
  const prices = new Map(unique.map((a, i) => [`${a.chain}:${a.address.toLowerCase()}`, results[i]?.data?.token]))
  const counts = { all: list.length, active: list.filter((a) => a.status === 'active').length, triggered: list.filter((a) => a.status === 'triggered').length }
  const shown = tab === 'all' ? list : list.filter((a) => a.status === tab)

  return (
    <div className="space-y-5">
      <PageHeader title="Alerts" description="Price and momentum alerts saved in this browser, checked every 30 seconds while Achilyon is open." />
      {mounted && <NotificationPrompt />}
      <Segmented label="Filter alerts" value={tab} onChange={setTab} options={[{ value: 'all', label: `All (${counts.all})` }, { value: 'active', label: `Active (${counts.active})` }, { value: 'triggered', label: `Triggered (${counts.triggered})` }]} />
      <Card className="overflow-hidden">
        {shown.length === 0 ? (
          <EmptyState icon={<Bell className="h-5 w-5" />} title={list.length ? `No ${tab} alerts` : 'No alerts yet'} description="Open any token page and use the Price alerts panel to get notified when a target is hit." action={!list.length && <ButtonLink href="/discover" variant="primary" size="sm">Find a token</ButtonLink>} />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((a) => {
              const t = prices.get(`${a.chain}:${a.address.toLowerCase()}`)
              const price = t?.market.priceUsd ?? null
              const unit = ALERT_TYPES[a.type].unit
              const distance = price && unit === '$' ? ((a.value - price) / price) * 100 : null
              return (
                <li key={a.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', a.status === 'triggered' ? 'bg-gold/15 text-gold' : 'bg-primary/10 text-primary')}>
                    {a.status === 'triggered' ? <BellRing className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={tokenPath(a.chain, a.address)} className="font-semibold hover:text-primary">{a.symbol}</Link>
                      <Badge>{NETWORKS[a.chain].name}</Badge>
                      <Badge tone={a.status === 'triggered' ? 'warn' : 'up'}>{a.status}</Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">
                      {ALERT_TYPES[a.type].label} <b className="num text-fg">{unit === '%' ? `${a.value}%` : formatPrice(a.value)}</b> · created {timeAgo(a.createdAt, now)}
                      {a.status === 'triggered' && a.triggeredValue !== null && <> · hit {unit === '%' ? formatPercent(a.triggeredValue) : formatPrice(a.triggeredValue)} {timeAgo(a.triggeredAt, now)}</>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right text-sm">
                      <div className="num">{price !== null ? formatPrice(price) : '—'}</div>
                      {distance !== null && a.status === 'active' ? <span className="num text-xs text-muted">{Math.abs(distance).toFixed(1)}% to target</span> : t && <PriceChange value={t.market.priceChange.h24} className="text-xs" />}
                    </div>
                    <div className="flex gap-1">
                      {a.status === 'triggered' && <Button size="icon" variant="ghost" onClick={() => rearm(a.id)} aria-label="Re-arm alert" title="Re-arm"><RotateCcw className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Delete alert" title="Delete"><Trash2 className="h-4 w-4" /></Button>
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
