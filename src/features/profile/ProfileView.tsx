'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flag, MessageCircle, Rocket, Award, UserRound } from 'lucide-react'
import type { Holding, MarketToken, Token, WalletTransaction } from '@/types'
import { api, errorMessage } from '@/lib/api/client'
import { useNow } from '@/hooks/useNow'
import { formatDateTime, formatUsd, formatTokenAmount, shortAddress, timeAgo } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { publicConfig, DEMO_WALLET_ADDRESS } from '@/lib/config'
import { Card, CardHeader, PageHeader, Skeleton, Stat } from '@/components/ui/primitives'
import { EmptyState, ErrorState, DemoBadge } from '@/components/ui/feedback'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/token/CopyButton'
import { TokenCard } from '@/features/market/TokenCard'
import { ReportDialog, type ReportTarget } from '@/components/community/ReportDialog'
import { cn } from '@/lib/cn'

export interface ProfileData {
  address: string
  joinedAt: number | null
  reputation: number
  createdTokens: MarketToken[]
  comments: { id: string; content: string; createdAt: number; likes: number; token: Token | null }[]
  activity: WalletTransaction[]
  holdings: Holding[] | null
  isSelf: boolean
}

function Identicon({ address, size = 64 }: { address: string; size?: number }) {
  let h = 0
  for (const ch of address.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) % 360
  return <div className="shrink-0 rounded-2xl" style={{ width: size, height: size, background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 60) % 360} 70% 35%))` }} aria-hidden />
}

export function ProfileView({ address }: { address: string }) {
  const [tab, setTab] = useState<'tokens' | 'comments' | 'activity'>('tokens')
  const [report, setReport] = useState<ReportTarget | null>(null)
  const now = useNow(60_000)
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['profile', address.toLowerCase()], queryFn: () => api.get<ProfileData>(`/api/profile/${address}`) })
  const isDemo = address.toLowerCase() === DEMO_WALLET_ADDRESS.toLowerCase()

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return <div className="space-y-4"><Skeleton className="h-28 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>

  const showActivity = data.activity.length > 0
  return (
    <div className="space-y-5">
      <PageHeader title="Profile" />
      <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <Identicon address={data.address} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-mono text-lg font-semibold">{shortAddress(data.address, 6)}</h2>
            <CopyButton value={data.address} label="Copy address" />
            {data.isSelf && <span className="rounded bg-primary/15 px-1.5 py-px text-[11px] font-semibold text-primary">You</span>}
            {isDemo && <DemoBadge label="Demo wallet" />}
          </div>
          <p className="mt-1 text-sm text-muted">{data.joinedAt ? `Active since ${formatDateTime(data.joinedAt)}` : 'No Achilyon activity yet'}</p>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:gap-6">
          <Stat label="Reputation" value={<span className="inline-flex items-center gap-1"><Award className="h-4 w-4 text-gold" aria-hidden />{data.reputation}</span>} />
          <Stat label="Launched" value={data.createdTokens.length} />
          <Stat label="Comments" value={data.comments.length} />
        </div>
        {!data.isSelf && <Button size="sm" variant="ghost" onClick={() => setReport({ type: 'account', id: data.address, label: shortAddress(data.address, 6) })}><Flag className="h-3.5 w-3.5" /> Report</Button>}
      </Card>
      <p className="text-xs text-subtle">Profiles only show activity that is already public on Achilyon. Balances are visible to the wallet owner only.</p>

      {data.holdings && data.holdings.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader title="Holdings" subtitle={isDemo || publicConfig.demoMode ? 'Simulated demo positions' : undefined} />
          <ul className="divide-y divide-line">
            {data.holdings.map((h) => (
              <li key={h.tokenAddress} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <Link href={tokenPath(h.chain, h.tokenAddress)} className="font-semibold hover:text-primary">{h.symbol}</Link>
                <span className="num text-muted">{formatTokenAmount(h.amount)} · <span className="text-fg">{formatUsd(h.valueUsd)}</span></span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div role="tablist" aria-label="Profile sections" className="flex gap-1 border-b border-line">
        {([['tokens', `Launched (${data.createdTokens.length})`, Rocket], ['comments', `Comments (${data.comments.length})`, MessageCircle], ...(showActivity ? [['activity', 'Activity', UserRound] as const] : [])] as const).map(([id, label, Icon]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium', tab === id ? 'text-fg' : 'text-muted hover:text-fg')}>
            <Icon className="h-3.5 w-3.5" aria-hidden />{label}
            {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {tab === 'tokens' && (data.createdTokens.length === 0 ? <EmptyState icon={<Rocket className="h-5 w-5" />} title="No launches yet" /> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.createdTokens.map((t) => <TokenCard key={t.token.address} token={t} now={now} variant="launch" />)}</div>
      ))}
      {tab === 'comments' && (data.comments.length === 0 ? <EmptyState icon={<MessageCircle className="h-5 w-5" />} title="No comments yet" /> : (
        <Card className="divide-y divide-line">
          {data.comments.map((c) => (
            <div key={c.id} className="px-4 py-3">
              <div className="text-xs text-muted">{c.token ? <Link href={tokenPath(c.token.chain, c.token.address)} className="font-semibold text-fg hover:text-primary">{c.token.symbol}</Link> : 'Removed token'} · {timeAgo(c.createdAt, now)} · {c.likes} likes</div>
              <p className="mt-1 whitespace-pre-line break-words text-sm">{c.content}</p>
            </div>
          ))}
        </Card>
      ))}
      {tab === 'activity' && showActivity && (
        <Card className="divide-y divide-line">
          {data.activity.map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span><span className={cn('font-medium capitalize', a.type === 'buy' ? 'text-up' : a.type === 'sell' ? 'text-down' : 'text-gold')}>{a.type}</span> <Link href={tokenPath(a.chain, a.tokenAddress)} className="font-semibold hover:text-primary">{a.symbol}</Link></span>
              <span className="num text-muted">{a.type !== 'launch' && `${formatUsd(a.amountUsd)} · `}{timeAgo(a.timestamp, now)}</span>
            </div>
          ))}
        </Card>
      )}
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </div>
  )
}
