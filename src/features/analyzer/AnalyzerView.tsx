'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AlertOctagon, CheckCircle2, Info, Search, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { ChainId, MarketToken, SearchResults } from '@/types'
import type { SecurityCheck, SecurityScore } from '@/lib/market/security'
import { marketRiskSignals } from '@/lib/market/risk'
import { api, errorMessage } from '@/lib/api/client'
import { FILTER_CHAINS, NETWORKS, detectAddressKind, isChainId } from '@/lib/blockchain/chains'
import { formatPrice, formatUsdCompact } from '@/lib/format'
import { tokenApi, tokenPath } from '@/lib/paths'
import { Button } from '@/components/ui/Button'
import { Badge, Card, CardHeader, Field, PageHeader, Skeleton } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/feedback'
import { TokenLogo } from '@/components/token/TokenLogo'
import { CopyButton } from '@/components/token/CopyButton'
import { cn } from '@/lib/cn'

const EXAMPLES: { label: string; chain: ChainId; address: string }[] = [
  { label: 'PEPE (Ethereum)', chain: 'ethereum', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
  { label: 'BONK (Solana)', chain: 'solana', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { label: 'BRETT (Base)', chain: 'base', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4' },
]

const STATUS = {
  pass: { icon: CheckCircle2, cls: 'text-up', label: 'Pass' },
  warn: { icon: TriangleAlert, cls: 'text-warn', label: 'Warning' },
  fail: { icon: AlertOctagon, cls: 'text-down', label: 'Fail' },
  info: { icon: Info, cls: 'text-primary', label: 'Info' },
} as const
const TONE = { good: 'text-up', ok: 'text-warn', bad: 'text-gold', critical: 'text-down' } as const

type Security = { available: boolean; reason: string | null; checks: SecurityCheck[]; score: SecurityScore | null }
interface Analysis { chain: ChainId; address: string; token: MarketToken | null; security: Security | null; securityError: string | null }

/** Resolves the network (explicit or via search) and gathers market + contract data. */
async function analyze(address: string, chain: ChainId | 'auto'): Promise<Analysis> {
  const kind = detectAddressKind(address)
  let resolved: ChainId = chain !== 'auto' ? chain : kind === 'solana' ? 'solana' : 'ethereum'
  let token: MarketToken | null = null
  if (chain === 'auto') {
    const found = await api.get<SearchResults>(`/api/search?q=${encodeURIComponent(address)}`).catch(() => null)
    const match = found?.tokens.find((t) => t.token.address.toLowerCase() === address.toLowerCase())
    if (match) { resolved = match.token.chain; token = match }
  }
  if (!token) token = await api.get<{ token: MarketToken }>(tokenApi(resolved, address)).then((r) => r.token).catch(() => null)
  let security: Security | null = null
  let securityError: string | null = null
  try { security = await api.get<Security>(`${tokenApi(resolved, address)}/security`) } catch (e) { securityError = errorMessage(e) }
  return { chain: resolved, address, token, security, securityError }
}

/**
 * Contract analyzer (ported from the original Achilyon analyzer page).
 * The URL (?address=&chain=) is the source of truth, so results are shareable.
 */
export function AnalyzerView() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const urlAddress = (params.get('address') ?? '').trim()
  const urlChainRaw = params.get('chain')
  const urlChain: ChainId | 'auto' = urlChainRaw && isChainId(urlChainRaw) ? urlChainRaw : 'auto'
  const [address, setAddress] = useState(urlAddress)
  const [chain, setChain] = useState<ChainId | 'auto'>(urlChain)
  const [inputError, setInputError] = useState<string | null>(null)
  const valid = Boolean(detectAddressKind(urlAddress))
  const query = useQuery({ queryKey: ['analyze', urlAddress, urlChain], queryFn: () => analyze(urlAddress, urlChain), enabled: valid, staleTime: 60_000, retry: 0 })

  const run = (addr = address, ch = chain) => {
    const a = addr.trim()
    if (!detectAddressKind(a)) return setInputError('That doesn’t look like a valid EVM (0x…) or Solana token address.')
    setInputError(null)
    router.replace(`${pathname}?address=${encodeURIComponent(a)}${ch !== 'auto' ? `&chain=${ch}` : ''}`, { scroll: false })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Contract analyzer" description="Paste a token address to check contract permissions, taxes, holder concentration and liquidity health before you trade." />
      <Card className="p-4 sm:p-5">
        <form onSubmit={(e) => { e.preventDefault(); run() }} className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
          <Field label="Token contract address" htmlFor="an-address" error={inputError ?? undefined}>
            <input id="an-address" className="input font-mono" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… or Solana mint address" spellCheck={false} autoComplete="off" maxLength={64} />
          </Field>
          <Field label="Network" htmlFor="an-chain">
            <select id="an-chain" className="input" value={chain} onChange={(e) => setChain(e.target.value as ChainId | 'auto')}>
              <option value="auto">Auto-detect</option>
              {FILTER_CHAINS.map((c) => <option key={c} value={c}>{NETWORKS[c].name}</option>)}
            </select>
          </Field>
          <Button type="submit" variant="primary" size="lg" loading={query.isFetching}>{!query.isFetching && <Search className="h-4 w-4" />} Analyze</Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
          Try:
          {EXAMPLES.map((ex) => <button key={ex.address} type="button" onClick={() => { setAddress(ex.address); setChain(ex.chain); run(ex.address, ex.chain) }} className="rounded-md border border-line px-2 py-1 hover:text-fg">{ex.label}</button>)}
        </div>
      </Card>

      {!valid && <Card><EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="Run a safety check" description="Combines GoPlus on-chain security data with market structure signals into a single, explainable score." /></Card>}
      {valid && query.isLoading && <div className="space-y-3" aria-busy="true"><Skeleton className="h-40 w-full rounded-2xl" /><Skeleton className="h-64 w-full rounded-2xl" /></div>}
      {valid && query.error && <Card><EmptyState icon={<ShieldAlert className="h-5 w-5" />} title="Couldn’t analyze this address" description={errorMessage(query.error)} /></Card>}
      {valid && query.data && <Report s={query.data} />}
    </div>
  )
}

function Report({ s }: { s: Analysis }) {
  const score = s.security?.score
  const market: SecurityCheck[] = s.token ? marketRiskSignals(s.token).map((r) => ({ id: r.id, label: r.label, detail: r.detail, status: r.level === 'danger' ? 'fail' : r.level === 'warn' ? 'warn' : 'info', weight: 0 })) : []
  return (
    <>
      <Card className="grid gap-5 p-5 md:grid-cols-[auto_1fr] md:items-center">
        <ScoreRing score={score?.score ?? null} tone={score?.tone ?? 'ok'} />
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {s.token && <TokenLogo src={s.token.token.logoUrl} symbol={s.token.token.symbol} size={36} />}
            <h2 className="font-display text-2xl font-semibold">{s.token?.token.symbol ?? 'Unknown token'}</h2>
            {s.token && <span className="text-muted">{s.token.token.name}</span>}
            <Badge>{NETWORKS[s.chain].name}</Badge>
          </div>
          {score && <p className={cn('text-lg font-semibold', TONE[score.tone])}>{score.grade}</p>}
          <p className="flex items-center gap-1 break-all font-mono text-xs text-muted">{s.address}<CopyButton value={s.address} /></p>
          {s.token && (
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span>Price <b className="num">{formatPrice(s.token.market.priceUsd)}</b></span>
              <span>Liquidity <b className="num">{formatUsdCompact(s.token.market.liquidityUsd)}</b></span>
              <span>FDV <b className="num">{formatUsdCompact(s.token.market.fdv)}</b></span>
              <Link href={tokenPath(s.token.token.chain, s.token.token.address)} className="text-primary hover:underline">Open token page →</Link>
            </div>
          )}
          {(s.securityError || (s.security && !s.security.available)) && <p className="text-xs text-warn">{s.securityError ?? s.security?.reason} {market.length ? 'Market signals are still shown below.' : ''}</p>}
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <CheckList title="Contract security" icon={<ShieldCheck className="h-4 w-4" />} checks={s.security?.checks ?? []} />
        <CheckList title="Market structure" icon={<Info className="h-4 w-4" />} checks={market} />
      </div>
      <p className="text-xs text-muted">Automated checks can miss things and never guarantee safety. Always do your own research.</p>
    </>
  )
}

function ScoreRing({ score, tone }: { score: number | null; tone: keyof typeof TONE }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-36 w-36" role="img" aria-label={score === null ? 'No contract score' : `Security score ${score} out of 100`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" stroke="rgba(255,255,255,0.08)" />
        {score !== null && <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" stroke="currentColor" className={cn('transition-all duration-700', TONE[tone])} strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num font-display text-4xl font-semibold">{score ?? '—'}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted">/ 100</span>
      </div>
    </div>
  )
}

function CheckList({ title, checks, icon }: { title: string; checks: SecurityCheck[]; icon: React.ReactNode }) {
  if (!checks.length) return null
  return (
    <Card>
      <CardHeader title={title} icon={icon} subtitle={`${checks.filter((c) => c.status === 'pass').length}/${checks.length} passed`} />
      <ul className="divide-y divide-line">
        {checks.map((c) => {
          const S = STATUS[c.status]
          return (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3">
              <S.icon className={cn('mt-0.5 h-4 w-4 shrink-0', S.cls)} aria-label={S.label} />
              <div className="min-w-0"><p className="text-sm font-medium">{c.label}</p><p className="text-xs text-muted">{c.detail}</p></div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
