'use client'
import Link from 'next/link'
import { AlertTriangle, ShieldCheck, ShieldAlert, Info } from 'lucide-react'
import type { MarketToken } from '@/types'
import { marketRiskSignals, riskLevel } from '@/lib/market/risk'
import { useSecurity } from '@/hooks/useMarket'
import { useNow } from '@/hooks/useNow'
import { Card, CardHeader, Skeleton } from '@/components/ui/primitives'
import { RiskBadge } from '@/components/token/badges'
import { cn } from '@/lib/cn'

export function RiskPanel({ t }: { t: MarketToken }) {
  const now = useNow(60_000)
  const signals = marketRiskSignals(t, now)
  const level = riskLevel(signals)
  const security = useSecurity(t.token.chain, t.token.address, t.source !== 'demo')

  return (
    <Card className="p-4">
      <CardHeader title="Risk signals" icon={<ShieldAlert className="h-4 w-4" />} action={<RiskBadge level={level} />} className="mb-3 p-0" />
      <ul className="space-y-2">
        {signals.map((s) => (
          <li key={s.id} className="flex gap-2.5 text-[12.5px]">
            {s.level === 'danger' ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-down" aria-label="High risk" /> : s.level === 'warn' ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn" aria-label="Warning" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-label="Info" />}
            <div><div className="font-medium">{s.label}</div><div className="text-muted">{s.detail}</div></div>
          </li>
        ))}
        {signals.length === 0 && <li className="text-[12.5px] text-muted">No market-structure warnings. That does not mean the token is safe.</li>}
      </ul>
      <div className="mt-4 border-t border-line pt-3">
        <div className="label mb-2">Contract scan</div>
        {t.source === 'demo' ? (
          <p className="text-[12px] text-muted">Simulated launchpad token — contract scans run for live tokens only.</p>
        ) : security.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : security.data?.available && security.data.score ? (
          <div className="flex items-center gap-3">
            <div className={cn('grid h-11 w-11 place-items-center rounded-xl border font-display text-lg font-semibold', security.data.score.tone === 'good' ? 'border-up/40 text-up' : security.data.score.tone === 'ok' ? 'border-warn/40 text-warn' : 'border-down/40 text-down')}>
              {security.data.score.grade}
            </div>
            <div className="text-[12.5px]">
              <div className="font-medium"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden />Score {security.data.score.score}/100</div>
              <Link href={`/analyzer?chain=${t.token.chain}&address=${t.token.address}`} className="text-primary hover:underline">View {security.data.checks.length} checks</Link>
            </div>
          </div>
        ) : (
          <p className="text-[12px] text-muted">{security.data?.reason ?? 'Contract scan unavailable right now.'}</p>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-subtle">Heuristics only — not financial advice. <Link href="/docs#risk" className="text-primary hover:underline">Read the risk guide</Link>.</p>
    </Card>
  )
}
