'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Rocket, Receipt } from 'lucide-react'
import type { WalletActivityType } from '@/types'
import { useWalletTransactions } from '@/hooks/useMarket'
import { useNow } from '@/hooks/useNow'
import { errorMessage } from '@/lib/api/client'
import { explorerTxUrl, explorerName } from '@/lib/blockchain/explorers'
import { formatDateTime, formatPrice, formatTokenAmount, formatUsd, shortAddress, timeAgo } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { Card, PageHeader, Skeleton, Badge } from '@/components/ui/primitives'
import { EmptyState, ErrorState, Notice } from '@/components/ui/feedback'
import { Segmented } from '@/components/ui/Segmented'
import { ButtonLink } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { RequireSession } from './RequireSession'

const ICON: Record<WalletActivityType, React.JSX.Element> = {
  buy: <ArrowDownLeft className="h-3.5 w-3.5 text-up" aria-hidden />,
  sell: <ArrowUpRight className="h-3.5 w-3.5 text-down" aria-hidden />,
  launch: <Rocket className="h-3.5 w-3.5 text-gold" aria-hidden />,
}

export function TransactionsView() {
  return (
    <div className="space-y-5">
      <PageHeader title="Transactions" description="Trades and launches made from your connected wallet." />
      <RequireSession purpose="see your transaction history">
        <TransactionsContent />
      </RequireSession>
    </div>
  )
}

function TransactionsContent() {
  const { data, isLoading, error, refetch } = useWalletTransactions()
  const [filter, setFilter] = useState<'all' | WalletActivityType>('all')
  const now = useNow(30_000)
  const items = useMemo(() => (data?.items ?? []).filter((t) => filter === 'all' || t.type === filter), [data, filter])

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return <Skeleton className="h-72 w-full rounded-2xl" />
  return (
    <div className="space-y-4">
      {!data.indexed && <Notice tone="info">Full history for external wallets needs an indexer, which is not configured. Only trades on the Achilyon launchpad contract (read from recent on-chain logs) are listed here — see a block explorer for everything else.</Notice>}
      <Segmented label="Filter by type" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'buy', label: 'Buys' }, { value: 'sell', label: 'Sells' }, { value: 'launch', label: 'Launches' }]} />
      {items.length === 0 ? (
        <EmptyState icon={<Receipt className="h-5 w-5" />} title="No transactions yet" description="Your trades and launches will appear here." action={<ButtonLink href="/discover" size="sm" variant="primary">Explore markets</ButtonLink>} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <caption className="sr-only">Wallet transactions</caption>
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.06em] text-subtle">
                {['Type', 'Token', 'Amount', 'Value', 'Price', 'Status', 'Time', 'Transaction'].map((h, i) => <th key={h} scope="col" className={cn('border-b border-line px-3 py-2.5 font-medium', i < 2 ? 'text-left' : 'text-right', i === 0 && 'pl-4', i === 7 && 'pr-4')}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const url = explorerTxUrl(t.chain, t.hash, t.source)
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className="border-b border-line py-2.5 pl-4 pr-3"><span className="inline-flex items-center gap-1.5 font-medium capitalize">{ICON[t.type]}{t.type}</span></td>
                    <td className="border-b border-line px-3"><Link href={tokenPath(t.chain, t.tokenAddress)} className="font-semibold hover:text-primary">{t.symbol}</Link></td>
                    <td className="num border-b border-line px-3 text-right">{t.type === 'launch' ? '—' : formatTokenAmount(t.amountToken)}</td>
                    <td className="num border-b border-line px-3 text-right">{t.type === 'launch' ? '—' : formatUsd(t.amountUsd)}</td>
                    <td className="num border-b border-line px-3 text-right text-muted">{formatPrice(t.priceUsd)}</td>
                    <td className="border-b border-line px-3 text-right"><Badge tone={t.status === 'confirmed' ? 'up' : t.status === 'failed' ? 'down' : 'warn'}>{t.status}</Badge></td>
                    <td className="num border-b border-line px-3 text-right text-muted" title={formatDateTime(t.timestamp)}>{timeAgo(t.timestamp, now)}</td>
                    <td className="border-b border-line py-2.5 pl-3 pr-4 text-right font-mono text-xs">
                      {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" title={`View on ${explorerName(t.chain)}`}>{shortAddress(t.hash, 5)}</a> : <span className="text-subtle" title="Simulated — not broadcast on-chain">{shortAddress(t.hash, 5)} · sim</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
