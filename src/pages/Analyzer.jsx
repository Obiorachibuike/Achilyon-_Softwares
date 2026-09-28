import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertOctagon, CheckCircle2, Info, Search, ShieldAlert, ShieldCheck, TriangleAlert } from 'lucide-react'
import { dexService, securityService } from '../services/api'
import { CHAINS, chainLabel } from '../config'
import { detectAddressKind, evmSecurityChecks, marketChecks, scoreChecks, solanaSecurityChecks } from '../lib/risk'
import { cn, formatPrice, formatUsdCompact, shortAddress } from '../lib/utils'
import { Badge, Button, Card, CardHeader, CopyButton, EmptyState, Field, PageHeader, Spinner, TokenAvatar, inputClass } from '../components/ui'

const EXAMPLES = [
  { label: 'PEPE (Ethereum)', chain: 'ethereum', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933' },
  { label: 'BONK (Solana)', chain: 'solana', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { label: 'BRETT (Base)', chain: 'base', address: '0x532f27101965dd16442E59d40670FaF5eBB142E4' },
]

const statusStyle = {
  pass: { icon: CheckCircle2, cls: 'text-emerald-400' },
  warn: { icon: TriangleAlert, cls: 'text-amber-400' },
  fail: { icon: AlertOctagon, cls: 'text-red-400' },
  info: { icon: Info, cls: 'text-sky-400' },
}
const toneStyle = { good: 'text-emerald-400', ok: 'text-amber-300', bad: 'text-orange-400', critical: 'text-red-400' }

function ScoreRing({ score, tone }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-36 w-36">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round" stroke="currentColor" className={cn('transition-all duration-700', toneStyle[tone])} strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="brand text-4xl font-bold tabular-nums">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

function CheckList({ title, checks, icon }) {
  if (!checks.length) return null
  return (
    <Card>
      <CardHeader title={title} icon={icon} subtitle={`${checks.filter((c) => c.status === 'pass').length}/${checks.length} passed`} />
      <ul className="divide-y divide-border/60">
        {checks.map((c) => {
          const S = statusStyle[c.status]
          return (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
              <S.icon size={17} className={cn('mt-0.5 shrink-0', S.cls)} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

export default function Analyzer() {
  const [params, setParams] = useSearchParams()
  const [address, setAddress] = useState(params.get('address') ?? '')
  const [chain, setChain] = useState(params.get('chain') ?? 'auto')
  const [state, setState] = useState({ status: 'idle' })

  const run = async (addr = address, ch = chain) => {
    const a = addr.trim()
    const kind = detectAddressKind(a)
    if (!kind) { setState({ status: 'error', message: 'That doesn’t look like a valid EVM (0x…) or Solana token address.' }); return }
    setParams({ address: a, ...(ch !== 'auto' ? { chain: ch } : {}) }, { replace: true })
    setState({ status: 'loading' })
    try {
      const allPairs = await dexService.getTokenPairs(a)
      const tokenPairs = allPairs.filter((p) => p.baseToken?.address?.toLowerCase() === a.toLowerCase())
      const relevant = tokenPairs.length ? tokenPairs : allPairs
      // Resolve chain: explicit choice > most liquid pair's chain > solana for base58.
      const byLiq = [...relevant].sort((x, y) => (y.liquidity?.usd ?? 0) - (x.liquidity?.usd ?? 0))
      const resolvedChain = ch !== 'auto' ? ch : byLiq[0]?.chainId ?? (kind === 'solana' ? 'solana' : 'ethereum')
      const chainPairs = relevant.filter((p) => p.chainId === resolvedChain)

      let security = null
      let securityError = null
      if (securityService.isSupported(resolvedChain)) {
        try { security = await securityService.getTokenSecurity(resolvedChain, a) } catch (e) { securityError = e?.message || 'Security API unavailable' }
      } else {
        securityError = `On-chain security checks are not available for ${chainLabel(resolvedChain)}.`
      }
      setState({ status: 'done', address: a, chain: resolvedChain, pairs: chainPairs, security, securityError, kind })
    } catch (e) {
      setState({ status: 'error', message: e?.message || 'Analysis failed. Please try again.' })
    }
  }

  useEffect(() => {
    if (params.get('address')) run(params.get('address'), params.get('chain') ?? 'auto')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const report = useMemo(() => {
    if (state.status !== 'done') return null
    const sec = state.chain === 'solana' ? solanaSecurityChecks(state.security) : evmSecurityChecks(state.security)
    const mkt = marketChecks(state.pairs)
    return { sec, mkt, ...scoreChecks([...sec, ...mkt]) }
  }, [state])

  const main = state.pairs?.slice().sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0]
  const tokenName = main?.baseToken?.name ?? state.security?.token_name ?? state.security?.metadata?.name
  const tokenSymbol = main?.baseToken?.symbol ?? state.security?.token_symbol ?? state.security?.metadata?.symbol

  return (
    <div className="space-y-5">
      <PageHeader title="Contract analyzer" description="Paste a token address to check contract permissions, taxes, holder concentration and liquidity health before you trade." />

      <Card className="p-4 sm:p-5">
        <form onSubmit={(e) => { e.preventDefault(); run() }} className="grid gap-3 md:grid-cols-[1fr_180px_auto] md:items-end">
          <Field label="Token contract address">
            <input className={cn(inputClass, 'font-mono')} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x… or Solana mint address" spellCheck={false} autoComplete="off" />
          </Field>
          <Field label="Chain">
            <select className={inputClass} value={chain} onChange={(e) => setChain(e.target.value)}>
              <option value="auto">Auto-detect</option>
              {CHAINS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
          <Button type="submit" variant="primary" size="lg" loading={state.status === 'loading'}>{state.status !== 'loading' && <Search size={15} />} Analyze</Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Try:
          {EXAMPLES.map((ex) => (
            <button key={ex.address} type="button" onClick={() => { setAddress(ex.address); setChain(ex.chain); run(ex.address, ex.chain) }} className="rounded-md border border-border px-2 py-1 hover:text-foreground">{ex.label}</button>
          ))}
        </div>
      </Card>

      {state.status === 'idle' && (
        <Card><EmptyState icon={ShieldCheck} title="Run a safety check" description="We combine GoPlus on-chain security data with DexScreener liquidity and trading data to give each token a risk score." /></Card>
      )}
      {state.status === 'loading' && <Spinner label="Scanning contract and liquidity…" />}
      {state.status === 'error' && <Card><EmptyState icon={ShieldAlert} title="Couldn’t analyze this address" description={state.message} /></Card>}

      {state.status === 'done' && report && (
        <>
          <Card className="grid gap-5 p-5 md:grid-cols-[auto_1fr] md:items-center">
            <ScoreRing score={report.score} tone={report.tone} />
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {main && <TokenAvatar pair={main} size={36} />}
                <h2 className="brand text-2xl font-bold">{tokenSymbol ?? shortAddress(state.address)}</h2>
                {tokenName && <span className="text-muted-foreground">{tokenName}</span>}
                <Badge>{chainLabel(state.chain)}</Badge>
              </div>
              <p className={cn('text-lg font-semibold', toneStyle[report.tone])}>{report.grade}</p>
              <p className="flex items-center gap-1 font-mono text-xs text-muted-foreground">{state.address}<CopyButton value={state.address} /></p>
              {main && (
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span>Price <b>{formatPrice(main.priceUsd)}</b></span>
                  <span>Liquidity <b>{formatUsdCompact(main.liquidity?.usd)}</b></span>
                  <span>FDV <b>{formatUsdCompact(main.fdv)}</b></span>
                  <Link to={`/token/${main.chainId}/${main.pairAddress}`} className="text-primary hover:underline">Open token page →</Link>
                </div>
              )}
              {state.securityError && <p className="text-xs text-amber-400">{state.securityError} The score is based on market data only.</p>}
            </div>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <CheckList title="Contract security" icon={ShieldCheck} checks={report.sec} />
            <CheckList title="Market structure" icon={Info} checks={report.mkt} />
          </div>
          <p className="text-xs text-muted-foreground">Automated checks can miss things and never guarantee safety. Always do your own research.</p>
        </>
      )}
    </div>
  )
}
