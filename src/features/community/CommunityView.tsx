'use client'
import Link from 'next/link'
import { Activity, Rocket, ShieldCheck, Users } from 'lucide-react'
import { useRealtimeStore } from '@/stores/realtime'
import { useTokenList } from '@/hooks/useMarket'
import { useNow } from '@/hooks/useNow'
import { formatTokenAmount, formatUsd, shortAddress, timeAgo } from '@/lib/format'
import { Card, CardHeader, PageHeader } from '@/components/ui/primitives'
import { DemoBadge } from '@/components/ui/feedback'
import { TokenCard, TokenCardSkeleton } from '@/features/market/TokenCard'
import { cn } from '@/lib/cn'

export function CommunityView() {
  const feed = useRealtimeStore((s) => s.feed)
  const status = useRealtimeStore((s) => s.status)
  const launches = useTokenList('new', 'status=bonding&pageSize=6')
  const now = useNow(5_000)

  return (
    <div className="space-y-5">
      <PageHeader title="Community" description="Live activity from across Achilyon. Discussion happens on each token page." eyebrow={launches.data?.demo ? <DemoBadge /> : undefined} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section aria-labelledby="launches-h">
            <h2 id="launches-h" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><Rocket className="h-4 w-4 text-gold" aria-hidden /> Latest launches</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {launches.data ? launches.data.items.map((t) => <TokenCard key={t.token.address} token={t} now={now} variant="launch" />) : Array.from({ length: 4 }, (_, i) => <TokenCardSkeleton key={i} />)}
            </div>
          </section>
          <Card className="p-5">
            <CardHeader title="Community guidelines" icon={<ShieldCheck className="h-4 w-4" />} className="mb-3 p-0" />
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>Be respectful — no harassment, hate or threats.</li>
              <li>No impersonation, spam or referral links.</li>
              <li>Never share or ask for private keys or seed phrases.</li>
              <li>Report scams and abuse with the flag button — moderators review every report.</li>
            </ul>
            <Link href="/docs#guidelines" className="mt-3 inline-block text-sm text-primary hover:underline">Read the full guidelines</Link>
          </Card>
        </div>
        <Card className="overflow-hidden">
          <CardHeader title="Live trades" icon={<Activity className="h-4 w-4 text-up" />} action={<span className={cn('text-[11px]', status === 'live' ? 'text-up' : 'text-muted')}>{status === 'live' ? '● Live' : status}</span>} />
          {feed.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted"><Users className="mx-auto mb-2 h-5 w-5" aria-hidden />Waiting for trades…</p>
          ) : (
            <ul className="max-h-[640px] divide-y divide-line overflow-y-auto" aria-live="polite" aria-relevant="additions">
              {feed.map((t) => (
                <li key={t.id} className="flex animate-rise items-center gap-2 px-4 py-2 text-[13px]">
                  <span className={cn('w-9 font-medium', t.side === 'buy' ? 'text-up' : 'text-down')}>{t.side === 'buy' ? 'Buy' : 'Sell'}</span>
                  <Link href={`/token/${t.chain}/${t.tokenAddress}`} className="font-semibold hover:text-primary">{t.symbol}</Link>
                  <span className="num text-muted">{formatTokenAmount(t.amountToken)}</span>
                  <span className="num ml-auto">{formatUsd(t.amountUsd)}</span>
                  <span className="hidden font-mono text-[11px] text-subtle sm:inline">{shortAddress(t.wallet, 3)}</span>
                  <span className="num w-10 text-right text-[11px] text-subtle">{timeAgo(t.timestamp, now)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
