'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ChainId, MarketToken, TradingPair } from '@/types'
import { useToken } from '@/hooks/useMarket'
import { useLiveToken } from '@/hooks/useLiveToken'
import { useNow } from '@/hooks/useNow'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useRecentStore } from '@/stores/recent'
import { Card } from '@/components/ui/primitives'
import { Notice } from '@/components/ui/feedback'
import { ReportDialog, type ReportTarget } from '@/components/community/ReportDialog'
import { cn } from '@/lib/cn'
import { TokenHeader } from './TokenHeader'
import { TokenStats } from './TokenStats'
import { ChartPanel } from './ChartPanel'
import { TradingPanel } from './TradingPanel'
import { BondingCurvePanel } from './BondingCurvePanel'
import { TradesTable } from './TradesTable'
import { CommentSection } from './CommentSection'
import { RiskPanel } from './RiskPanel'
import { TokenInfo } from './TokenInfo'
import { AlertPanel } from '@/features/alerts/AlertPanel'

type Tab = 'trades' | 'comments'

export function TokenView({ chain, address, initial }: { chain: ChainId; address: string; initial: { token: MarketToken; pairs: TradingPair[] } }) {
  const { data } = useToken(chain, address, initial)
  const { token: t, quote } = useLiveToken(data?.token ?? initial.token)
  const pairs = data?.pairs ?? initial.pairs
  const now = useNow(30_000)
  const [tab, setTab] = useState<Tab>('trades')
  const [report, setReport] = useState<ReportTarget | null>(null)
  const record = useRecentStore((s) => s.record)
  // Render a single trading panel: inline under the chart on small screens, in the sidebar on xl.
  const wide = useMediaQuery('(min-width: 1280px)')

  useEffect(() => {
    record({ chain: t.token.chain, address: t.token.address, symbol: t.token.symbol, name: t.token.name, logoUrl: t.token.logoUrl })
    // Only when the viewed token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.token.chain, t.token.address])

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted">
        <Link href="/discover" className="hover:text-fg">Discover</Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span className="text-fg">{t.token.symbol}</span>
      </nav>
      <TokenHeader t={t} quote={quote} onReport={() => setReport({ type: 'token', id: `${t.token.chain}:${t.token.address}`, label: `${t.token.name} (${t.token.symbol})` })} />
      {t.source === 'demo' && (
        <Notice tone="demo">Simulated token with generated market activity (Demo Data). Prices, holders and trades are not real.</Notice>
      )}
      <TokenStats t={t} now={now} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          <ChartPanel t={t} />
          {!wide && <TradingPanel token={t} />}
          <Card className="overflow-hidden">
            <div role="tablist" aria-label="Token activity" className="flex border-b border-line px-2">
              {([['trades', 'Trades'], ['comments', `Comments (${t.social.comments})`]] as [Tab, string][]).map(([id, label]) => (
                <button key={id} id={`tab-${id}`} role="tab" type="button" aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)} className={cn('relative px-3 py-3 text-sm font-medium transition-colors', tab === id ? 'text-fg' : 'text-muted hover:text-fg')}>
                  {label}
                  {tab === id && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
            <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
              {tab === 'trades' ? <TradesTable t={t} /> : <CommentSection t={t} />}
            </div>
          </Card>
        </div>
        <aside className="space-y-5">
          {wide && <TradingPanel token={t} />}
          <BondingCurvePanel t={t} />
          <RiskPanel t={t} />
          <TokenInfo t={t} pairs={pairs} />
          <AlertPanel t={t} />
        </aside>
      </div>
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </div>
  )
}
