'use client'
import Link from 'next/link'
import { PieChart } from 'lucide-react'
import type { ChainId } from '@/types'
import { usePortfolio } from '@/hooks/useMarket'
import { useWallet } from '@/stores/wallet'
import { usePreferences } from '@/stores/preferences'
import { publicConfig } from '@/lib/config'
import { errorMessage } from '@/lib/api/client'
import { FILTER_CHAINS, NETWORKS } from '@/lib/blockchain/chains'
import { formatPrice, formatTokenAmount, formatUsd, formatUsdCompact, formatPercent } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { Card, CardHeader, PageHeader, Skeleton, Stat } from '@/components/ui/primitives'
import { DemoBadge, EmptyState, ErrorState, Notice } from '@/components/ui/feedback'
import { ButtonLink } from '@/components/ui/Button'
import { TokenLogo } from '@/components/token/TokenLogo'
import { PriceChange } from '@/components/token/PriceChange'
import { AddressChip } from '@/components/token/AddressChip'
import { cn } from '@/lib/cn'
import { RequireSession } from './RequireSession'
import { ValueChart } from './ValueChart'
import { useState } from 'react'

export function PortfolioView() {
  return (
    <div className="space-y-5">
      <PageHeader title="Portfolio" description="Holdings, performance and profit & loss for your connected wallet." />
      <RequireSession purpose="see your holdings and P&L">
        <PortfolioContent />
      </RequireSession>
    </div>
  )
}

function PortfolioContent() {
  const session = useWallet((s) => s.session)
  const prefNetwork = usePreferences((s) => s.network)
  const [chain, setChain] = useState<ChainId>(prefNetwork !== 'all' ? prefNetwork : publicConfig.defaultChain)
  const { data, isLoading, error, refetch } = usePortfolio(chain)
  const demo = Boolean(session?.demo)

  if (error && !data) return <ErrorState message={errorMessage(error)} onRetry={() => void refetch()} />
  if (isLoading || !data) return <div className="grid gap-4 sm:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20" />)}<Skeleton className="h-64 sm:col-span-4" /></div>

  const pnl = data.unrealizedPnlUsd + data.realizedPnlUsd
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {session && <AddressChip value={session.address} chain={chain} source={demo ? 'demo' : 'live'} />}
        {demo ? <DemoBadge label="Demo wallet · simulated funds" /> : (
          <label className="ml-auto flex items-center gap-2 text-xs text-muted">
            Network
            <select className="input h-8 w-auto py-0" value={chain} onChange={(e) => setChain(e.target.value as ChainId)}>
              {FILTER_CHAINS.filter((c) => NETWORKS[c].kind === 'evm').map((c) => <option key={c} value={c}>{NETWORKS[c].name}</option>)}
            </select>
          </label>
        )}
      </div>
      {data.notes.map((n) => <Notice key={n} tone="info">{n}</Notice>)}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card className="p-4"><Stat label="Total value" value={formatUsd(data.totalValueUsd)} sub={<PriceChange value={data.change24hPct} />} /></Card>
        <Card className="p-4"><Stat label={demo ? 'Demo cash' : 'Native balance'} value={formatUsd(data.cashUsd)} /></Card>
        <Card className="p-4"><Stat label="24h change" value={<span className={data.change24hUsd >= 0 ? 'text-up' : 'text-down'}>{data.change24hUsd >= 0 ? '+' : '−'}{formatUsd(Math.abs(data.change24hUsd))}</span>} /></Card>
        <Card className="p-4"><Stat label="Unrealized P&L" value={<Signed v={data.unrealizedPnlUsd} />} /></Card>
        <Card className="p-4"><Stat label="Realized P&L" value={<Signed v={data.realizedPnlUsd} />} sub={<span className="text-muted">Total <Signed v={pnl} /></span>} /></Card>
      </div>
      {data.history.length > 1 && (
        <Card className="p-4">
          <CardHeader title="Value history" subtitle={demo ? 'Simulated history (Demo Data)' : 'Last 30 days'} className="mb-2 p-0" />
          <ValueChart points={data.history} />
        </Card>
      )}
      <Card className="overflow-hidden">
        <CardHeader title="Holdings" icon={<PieChart className="h-4 w-4" />} subtitle={`${data.holdings.length} positions`} action={<Link href="/transactions" className="text-xs text-muted hover:text-fg">Transactions →</Link>} />
        {data.holdings.length === 0 ? (
          <EmptyState title="No token positions" description={demo ? 'Buy a token with your demo balance to see it here.' : 'Token balances need an indexer — see the note above.'} action={<ButtonLink href="/discover" size="sm" variant="primary">Find tokens</ButtonLink>} className="border-0" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <caption className="sr-only">Token holdings</caption>
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.06em] text-subtle">
                  {['Token', 'Amount', 'Price', '24h', 'Value', 'Avg cost', 'P&L', 'Allocation'].map((h, i) => <th key={h} scope="col" className={cn('border-b border-line px-3 py-2 font-medium', i === 0 ? 'pl-4 text-left' : 'text-right', i === 7 && 'pr-4')}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.holdings.map((h) => {
                  const alloc = data.totalValueUsd > 0 ? (h.valueUsd / data.totalValueUsd) * 100 : 0
                  return (
                    <tr key={`${h.chain}:${h.tokenAddress}`} className="hover:bg-white/[0.02]">
                      <td className="border-b border-line py-2.5 pl-4 pr-3">
                        <Link href={tokenPath(h.chain, h.tokenAddress)} className="flex items-center gap-2.5 hover:text-primary">
                          <TokenLogo src={h.logoUrl} symbol={h.symbol} size={28} />
                          <span><span className="font-semibold">{h.symbol}</span><span className="block text-[11px] text-muted">{h.name}</span></span>
                        </Link>
                      </td>
                      <td className="num border-b border-line px-3 text-right">{formatTokenAmount(h.amount)}</td>
                      <td className="num border-b border-line px-3 text-right">{formatPrice(h.priceUsd)}</td>
                      <td className="border-b border-line px-3 text-right"><PriceChange value={h.change24h} showIcon={false} /></td>
                      <td className="num border-b border-line px-3 text-right font-medium">{formatUsdCompact(h.valueUsd)}</td>
                      <td className="num border-b border-line px-3 text-right text-muted">{formatPrice(h.avgCostUsd)}</td>
                      <td className="num border-b border-line px-3 text-right"><Signed v={h.pnlUsd} /> <span className={cn('text-[11px]', h.pnlPct >= 0 ? 'text-up' : 'text-down')}>({formatPercent(h.pnlPct)})</span></td>
                      <td className="border-b border-line py-2.5 pl-3 pr-4 text-right">
                        <div className="ml-auto w-24"><div className="num text-[11px] text-muted">{alloc.toFixed(1)}%</div><div className="mt-1 h-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-primary" style={{ width: `${alloc}%` }} /></div></div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function Signed({ v }: { v: number }) {
  return <span className={cn('num', v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-muted')}>{v > 0 ? '+' : v < 0 ? '−' : ''}{formatUsd(Math.abs(v))}</span>
}
