'use client'
import Link from 'next/link'
import type { MarketToken } from '@/types'
import { useTrades } from '@/hooks/useMarket'
import { useNow } from '@/hooks/useNow'
import { errorMessage } from '@/lib/api/client'
import { formatPrice, formatTokenAmount, formatUsd, shortAddress, timeAgo } from '@/lib/format'
import { explorerTxUrl } from '@/lib/blockchain/explorers'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorState } from '@/components/ui/feedback'
import { cn } from '@/lib/cn'

export function TradesTable({ t }: { t: MarketToken }) {
  const { data, isLoading, error, refetch } = useTrades(t.token.chain, t.token.address)
  const now = useNow(10_000)
  if (error && !data) return <ErrorState title="Couldn't load trades" message={errorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading) return <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
  if (!data?.length) return <EmptyState title="No trades yet" description="Trades will appear here in real time." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <caption className="sr-only">Recent trades for {t.token.symbol}</caption>
        <thead>
          <tr className="text-[11px] uppercase tracking-[0.06em] text-subtle">
            <th scope="col" className="border-b border-line px-4 py-2 text-left font-medium">Time</th>
            <th scope="col" className="border-b border-line px-3 py-2 text-left font-medium">Type</th>
            <th scope="col" className="border-b border-line px-3 py-2 text-right font-medium">USD</th>
            <th scope="col" className="border-b border-line px-3 py-2 text-right font-medium">{t.token.symbol}</th>
            <th scope="col" className="border-b border-line px-3 py-2 text-right font-medium">Price</th>
            <th scope="col" className="border-b border-line px-3 py-2 text-right font-medium">Maker</th>
            <th scope="col" className="border-b border-line px-4 py-2 text-right font-medium">Tx</th>
          </tr>
        </thead>
        <tbody>
          {data.map((tr) => {
            const url = explorerTxUrl(tr.chain, tr.hash, tr.source)
            return (
              <tr key={tr.id} className="hover:bg-white/[0.02]">
                <td className="num whitespace-nowrap border-b border-line px-4 py-2 text-muted">{timeAgo(tr.timestamp, now)}</td>
                <td className={cn('border-b border-line px-3 py-2 font-medium', tr.side === 'buy' ? 'text-up' : 'text-down')}>{tr.side === 'buy' ? 'Buy' : 'Sell'}</td>
                <td className="num border-b border-line px-3 py-2 text-right">{formatUsd(tr.amountUsd)}</td>
                <td className="num border-b border-line px-3 py-2 text-right text-muted">{formatTokenAmount(tr.amountToken)}</td>
                <td className="num border-b border-line px-3 py-2 text-right">{formatPrice(tr.priceUsd)}</td>
                <td className="border-b border-line px-3 py-2 text-right"><Link href={`/profile/${tr.wallet}`} className="font-mono text-xs text-muted hover:text-fg">{shortAddress(tr.wallet)}</Link></td>
                <td className="border-b border-line px-4 py-2 text-right font-mono text-xs">
                  {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{shortAddress(tr.hash, 3)}</a> : <span className="text-subtle" title="Simulated — not on-chain">sim</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
