'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Flag, MessageSquareWarning, Ban, Star, Lock } from 'lucide-react'
import type { Comment, Report } from '@/types'
import { api, errorMessage } from '@/lib/api/client'
import { useWallet } from '@/stores/wallet'
import { useNow } from '@/hooks/useNow'
import { toast } from '@/stores/toast'
import { isChainId } from '@/lib/blockchain/chains'
import { shortAddress, timeAgo } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { Badge, Card, CardHeader, PageHeader, Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorState, Notice } from '@/components/ui/feedback'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { RequireSession } from '@/features/portfolio/RequireSession'

type Action = 'resolve' | 'dismiss' | 'hide_comment' | 'verify_token' | 'unverify_token' | 'feature_token' | 'unfeature_token' | 'blacklist' | 'unblacklist'
interface Queue {
  reports: Report[]
  flaggedAccounts: { address: string; reasons: string[]; at: number }[]
  flaggedComments: Omit<Comment, 'likedByMe' | 'replyCount'>[]
  blacklist: string[]
  featured: string[]
}

export function ModerationConsole() {
  return (
    <div className="space-y-5">
      <PageHeader title="Moderation" description="Review reports, flagged comments and accounts. Every action is enforced server-side for admin sessions only." />
      <RequireSession purpose="access moderation tools"><AdminGate /></RequireSession>
    </div>
  )
}

function AdminGate() {
  const session = useWallet((s) => s.session)
  if (session?.role !== 'admin') return <EmptyState icon={<Lock className="h-5 w-5" />} title="Admins only" description="Your wallet doesn't have moderator access. Admin wallets are configured by the operator (ADMIN_ADDRESSES)." />
  return <Console demo={session.demo} />
}

function tokenLink(targetId: string) {
  const [chain, ...rest] = targetId.split(':')
  const address = rest.join(':')
  return chain && isChainId(chain) && address ? tokenPath(chain, address) : null
}

function Console({ demo }: { demo: boolean }) {
  const qc = useQueryClient()
  const now = useNow(30_000)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [busy, setBusy] = useState<string | null>(null)
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['moderation'], queryFn: () => api.get<Queue>('/api/admin/moderation'), refetchInterval: 20_000 })

  const act = async (action: Action, targetId: string, reportId?: string) => {
    setBusy(`${action}:${targetId}`)
    try {
      await api.post('/api/admin/moderation', { action, targetId, reportId })
      toast.success('Done', action.replace(/_/g, ' '))
      await qc.invalidateQueries({ queryKey: ['moderation'] })
      void qc.invalidateQueries({ queryKey: ['comments'] })
    } catch (e) {
      toast.error('Action failed', errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return <Skeleton className="h-72 w-full rounded-2xl" />
  const reports = data.reports.filter((r) => filter === 'all' || r.status === 'open')
  const b = (action: Action, id: string) => busy === `${action}:${id}`

  return (
    <div className="space-y-5">
      {demo && <Notice tone="demo">You are moderating as the demo wallet. Moderation data lives in server memory and resets on restart.</Notice>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><div className="label">Open reports</div><div className="num mt-1 text-xl font-semibold">{data.reports.filter((r) => r.status === 'open').length}</div></Card>
        <Card className="p-4"><div className="label">Flagged comments</div><div className="num mt-1 text-xl font-semibold">{data.flaggedComments.length}</div></Card>
        <Card className="p-4"><div className="label">Flagged accounts</div><div className="num mt-1 text-xl font-semibold">{data.flaggedAccounts.length}</div></Card>
        <Card className="p-4"><div className="label">Blacklisted</div><div className="num mt-1 text-xl font-semibold">{data.blacklist.length}</div></Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Reports" icon={<Flag className="h-4 w-4" />} action={<Segmented label="Report filter" size="xs" value={filter} onChange={setFilter} options={[{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }]} />} />
        {reports.length === 0 ? <EmptyState title="Queue is clear" description="New reports from users appear here." className="py-10" /> : (
          <ul className="divide-y divide-line">
            {reports.map((r) => {
              const href = r.targetType === 'token' ? tokenLink(r.targetId) : r.targetType === 'account' ? `/profile/${r.targetId}` : null
              return (
                <li key={r.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge tone="warn">{r.reason}</Badge>
                      <span className="capitalize text-muted">{r.targetType}</span>
                      {href ? <Link href={href} className="truncate font-mono text-xs text-primary hover:underline">{r.targetId}</Link> : <span className="truncate font-mono text-xs">{r.targetId}</span>}
                      <Badge tone={r.status === 'open' ? 'primary' : 'neutral'}>{r.status}</Badge>
                    </div>
                    {r.details && <p className="mt-1 break-words text-sm text-muted">{r.details}</p>}
                    <p className="mt-1 text-[11px] text-subtle">by {shortAddress(r.reporter)} · {timeAgo(r.createdAt, now)}</p>
                  </div>
                  {r.status === 'open' && (
                    <div className="flex flex-wrap gap-1.5">
                      {r.targetType === 'comment' && <Button size="xs" variant="danger" loading={b('hide_comment', r.targetId)} onClick={() => void act('hide_comment', r.targetId, r.id)}>Hide comment</Button>}
                      {r.targetType === 'token' && <Button size="xs" variant="danger" loading={b('unverify_token', r.targetId)} onClick={() => void act('unverify_token', r.targetId, r.id)}>Unverify token</Button>}
                      {r.targetType === 'account' && <Button size="xs" variant="danger" loading={b('blacklist', r.targetId)} onClick={() => void act('blacklist', r.targetId, r.id)}>Blacklist</Button>}
                      <Button size="xs" loading={b('resolve', r.id)} onClick={() => void act('resolve', r.id)}>Resolve</Button>
                      <Button size="xs" variant="ghost" loading={b('dismiss', r.id)} onClick={() => void act('dismiss', r.id)}>Dismiss</Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Flagged comments" icon={<MessageSquareWarning className="h-4 w-4" />} subtitle="Held by automatic moderation or multiple reports" />
          {data.flaggedComments.length === 0 ? <p className="p-6 text-center text-sm text-muted">Nothing flagged.</p> : (
            <ul className="divide-y divide-line">
              {data.flaggedComments.map((c) => (
                <li key={c.id} className="px-4 py-3">
                  <p className="break-words text-sm">{c.content}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-subtle">
                    <span>{shortAddress(c.author)} · {timeAgo(c.createdAt, now)}</span>
                    <Button size="xs" variant="danger" loading={b('hide_comment', c.id)} onClick={() => void act('hide_comment', c.id)}>Hide</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Accounts" icon={<Ban className="h-4 w-4" />} subtitle="Auto-flagged by spam heuristics, and the blacklist" />
          <ul className="divide-y divide-line">
            {data.flaggedAccounts.map((a) => (
              <li key={a.address} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <div className="min-w-0"><Link href={`/profile/${a.address}`} className="font-mono text-xs hover:text-primary">{shortAddress(a.address, 6)}</Link><div className="truncate text-[11px] text-muted">{a.reasons.join(' · ')}</div></div>
                {!data.blacklist.includes(a.address.toLowerCase()) && <Button size="xs" variant="danger" loading={b('blacklist', a.address)} onClick={() => void act('blacklist', a.address)}>Blacklist</Button>}
              </li>
            ))}
            {data.blacklist.map((addr) => (
              <li key={addr} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs"><Badge tone="down">blacklisted</Badge> {shortAddress(addr, 6)}</span>
                <Button size="xs" loading={b('unblacklist', addr)} onClick={() => void act('unblacklist', addr)}>Remove</Button>
              </li>
            ))}
            {data.flaggedAccounts.length === 0 && data.blacklist.length === 0 && <li className="p-6 text-center text-sm text-muted">No flagged accounts.</li>}
          </ul>
        </Card>
      </div>
      <Card className="p-4">
        <CardHeader title="Featured & verified tokens" icon={<Star className="h-4 w-4 text-gold" />} subtitle="Use the token key format chain:address" className="mb-3 p-0" />
        <TokenKeyActions onAct={act} />
        {data.featured.length > 0 && <p className="mt-3 text-xs text-muted">Featured: {data.featured.map((k) => <span key={k} className="mr-2 font-mono">{k}</span>)}</p>}
      </Card>
      <p className="flex items-center gap-1.5 text-xs text-subtle"><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> All actions require an admin session and are validated server-side.</p>
    </div>
  )
}

function TokenKeyActions({ onAct }: { onAct: (a: Action, id: string) => Promise<void> }) {
  const [key, setKey] = useState('')
  const valid = /^[a-z]+:[A-Za-z0-9]{32,64}$/.test(key.trim()) && isChainId(key.split(':')[0] ?? '')
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input className="input font-mono text-xs" placeholder="base:0x…" value={key} onChange={(e) => setKey(e.target.value)} aria-label="Token key" />
      <div className="flex gap-1.5">
        {(['verify_token', 'unverify_token', 'feature_token', 'unfeature_token'] as const).map((a) => (
          <Button key={a} size="sm" disabled={!valid} onClick={() => void onAct(a, key.trim())}>{a.replace('_token', '').replace('un', 'un-')}</Button>
        ))}
      </div>
    </div>
  )
}
