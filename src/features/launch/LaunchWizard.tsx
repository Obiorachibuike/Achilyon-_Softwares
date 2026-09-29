'use client'
import Link from 'next/link'
import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ImagePlus, Rocket, X, AlertTriangle, PartyPopper, ArrowLeft, ArrowRight } from 'lucide-react'
import type { MarketToken } from '@/types'
import { FILTER_CHAINS, NETWORKS } from '@/lib/blockchain/chains'
import { launchCurveConfig, quoteBuy, curveAt, summarizeCurve } from '@/lib/bondingCurve'
import { INITIAL_TX_STATE, isBusy, txReducer } from '@/lib/transactions/stateMachine'
import { api, errorMessage } from '@/lib/api/client'
import { formatCompact, formatPrice, formatUsd, formatUsdCompact } from '@/lib/format'
import { tokenPath } from '@/lib/paths'
import { useWallet } from '@/stores/wallet'
import { usePreferences } from '@/stores/preferences'
import { publicConfig } from '@/lib/config'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Card, Field, PageHeader, Skeleton } from '@/components/ui/primitives'
import { useMounted } from '@/hooks/useMounted'
import { Notice, DemoBadge } from '@/components/ui/feedback'
import { TokenLogo } from '@/components/token/TokenLogo'
import { TxProgress } from '@/components/tx/TxProgress'
import { cn } from '@/lib/cn'
import { launchpadFor, launchpadDeployments } from '@/lib/contracts/deployments'
import { deadlineIn, launchToken, quoteLaunch } from '@/lib/contracts/launchpad'
import { runTx } from '@/lib/transactions/runTx'
import { contractErrorMessage, isUserRejection } from '@/lib/contracts/errors'
import { useLaunchpadWallet } from '@/hooks/useLaunchpad'
import { toast } from '@/stores/toast'
import { minInitialTokens, onchainDraftProblem, toLaunchParams } from './onchain'
import { MAX_LOGO_BYTES, decimalsFor, emptyDraft, liquidityPct, toRequest, validateStep, type FieldErrors, type LaunchDraft } from './draft'

const STEPS = ['Details', 'Links', 'Tokenomics', 'Launch settings', 'Review', 'Deploy'] as const
const DRAFT_KEY = 'achilyon-launch-draft'

/** What the success step shows — a simulated launch carries full market data, an on-chain one only its address. */
interface LaunchedToken {
  chain: MarketToken['token']['chain']
  address: string
  name: string
  symbol: string
  logoUrl: string | null
  priceUsd: number | null
  onchain: boolean
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Client-only: the draft is restored from localStorage on first render. */
export function LaunchWizard() {
  const mounted = useMounted()
  if (!mounted) return <div className="mx-auto max-w-5xl space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-8 w-full" /><Skeleton className="h-96 w-full rounded-2xl" /></div>
  return <Wizard />
}

function Wizard() {
  const network = usePreferences((s) => s.network)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<LaunchDraft>(() => {
    const base = emptyDraft(network !== 'all' ? network : publicConfig.defaultChain)
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      return saved ? { ...base, ...(JSON.parse(saved) as Partial<LaunchDraft>) } : base
    } catch {
      return base
    }
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [ack, setAck] = useState(false)
  const [tx, dispatch] = useReducer(txReducer, INITIAL_TX_STATE)
  const [launched, setLaunched] = useState<LaunchedToken | null>(null)
  const wallet = useWallet()
  const qc = useQueryClient()
  const heading = useRef<HTMLHeadingElement>(null)

  // Persist the draft locally so a refresh doesn't lose work (restored in the lazy initialiser).
  useEffect(() => {
    if (launched) return
    const id = setTimeout(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)) } catch { /* quota */ } }, 400)
    return () => clearTimeout(id)
  }, [draft, launched])

  const set = <K extends keyof LaunchDraft>(k: K, v: LaunchDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const go = (to: number) => {
    setStep(to)
    requestAnimationFrame(() => heading.current?.focus())
  }
  const next = () => {
    const errs = validateStep(step, draft)
    setErrors(errs)
    if (Object.keys(errs).length === 0) go(step + 1)
  }

  const deployment = launchpadFor(draft.chain)
  const lp = useLaunchpadWallet(deployment)
  const realWallet = wallet.status === 'connected' && !wallet.isDemo
  const onchainProblem = realWallet && deployment ? onchainDraftProblem(draft) : null
  const [switching, setSwitching] = useState(false)

  const switchNetwork = async () => {
    setSwitching(true)
    try {
      await lp.switchNetwork()
    } catch (e) {
      toast.error('Network not switched', contractErrorMessage(e))
    } finally {
      setSwitching(false)
    }
  }

  /** Real launch: createToken on the configured launchpad, signed by the user's wallet. */
  const deployOnchain = async () => {
    const client = lp.client
    if (!client || !deployment || onchainProblem) return
    go(5)
    const base = toLaunchParams(draft)
    const res = await runTx(
      dispatch,
      async (hooks) => {
        const expected = await quoteLaunch(client.publicClient, deployment.address, { creator: client.account, ...base })
        return launchToken(client, { ...base, minTokensOut: minInitialTokens(expected.tokensOut, draft.slippageBps), deadline: deadlineIn(10 * 60) }, hooks)
      },
      { isRejection: isUserRejection, message: contractErrorMessage },
    )
    if (!res) return
    setLaunched({ chain: draft.chain, address: res.token, name: base.name, symbol: base.symbol, logoUrl: null, priceUsd: null, onchain: true })
    localStorage.removeItem(DRAFT_KEY)
    void qc.invalidateQueries({ queryKey: ['tokens'] })
    void qc.invalidateQueries({ queryKey: ['wallet-tx'] })
  }

  const deploy = async () => {
    if (realWallet) return deployOnchain()
    go(5)
    dispatch({ type: 'START', simulated: true })
    try {
      if (wallet.status !== 'connected') throw new Error('Connect a wallet first')
      const session = await wallet.ensureSession()
      if (!session) throw new Error('Sign-in was cancelled')
      if (!session.demo) throw new Error('On-chain launches are not enabled on this deployment yet — use the demo wallet.')
      dispatch({ type: 'REQUEST_SIGNATURE' })
      await sleep(700)
      dispatch({ type: 'SUBMITTED' })
      const res = await api.post<{ token: MarketToken; hash: string }>('/api/launch', toRequest(draft))
      dispatch({ type: 'CONFIRMED', hash: res.hash })
      setLaunched({ chain: res.token.token.chain, address: res.token.token.address, name: res.token.token.name, symbol: res.token.token.symbol, logoUrl: res.token.token.logoUrl, priceUsd: res.token.market.priceUsd, onchain: false })
      localStorage.removeItem(DRAFT_KEY)
      void qc.invalidateQueries({ queryKey: ['tokens'] })
      void qc.invalidateQueries({ queryKey: ['portfolio'] })
      void qc.invalidateQueries({ queryKey: ['wallet-tx'] })
    } catch (e) {
      dispatch({ type: 'FAILED', error: errorMessage(e) })
    }
  }

  const reset = () => {
    setDraft(emptyDraft(draft.chain))
    setLaunched(null)
    setAck(false)
    dispatch({ type: 'RESET' })
    go(0)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Launch a token" description="Create a token on a fair bonding curve. No presale — everyone buys from the same curve, and liquidity migrates to a DEX automatically when it fills." eyebrow={publicConfig.demoMode ? <DemoBadge label="Demo launches" /> : undefined} />
      <Stepper step={step} done={Boolean(launched)} onJump={(i) => i < step && !isBusy(tx.phase) && !launched && go(i)} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 sm:p-6">
          <h2 ref={heading} tabIndex={-1} className="font-display text-lg font-semibold outline-none">{launched ? 'Your token is live' : STEPS[step]}</h2>
          <div className="mt-5">
            {step === 0 && <DetailsStep d={draft} set={set} errors={errors} />}
            {step === 1 && <LinksStep d={draft} set={set} errors={errors} />}
            {step === 2 && <TokenomicsStep d={draft} set={set} errors={errors} />}
            {step === 3 && <SettingsStep d={draft} set={set} errors={errors} onchain={realWallet && Boolean(deployment)} />}
            {step === 4 && <ReviewStep d={draft} ack={ack} setAck={setAck} onchainProblem={onchainProblem} />}
            {step === 5 && (launched ? <SuccessStep token={launched} hash={tx.hash} onAnother={reset} /> : (
              <div className="space-y-4">
                <TxProgress state={tx} chain={draft.chain} />
                {(tx.phase === 'failed' || tx.phase === 'rejected') && (
                  <div className="flex gap-2">
                    <Button onClick={() => go(4)}><ArrowLeft className="h-4 w-4" /> Back to review</Button>
                    <Button variant="primary" onClick={() => void deploy()}>Try again</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {step < 5 && (
            <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
              <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft className="h-4 w-4" /> Back</Button>
              {step < 4 ? (
                <Button variant="primary" onClick={next}>Continue <ArrowRight className="h-4 w-4" /></Button>
              ) : wallet.status !== 'connected' ? (
                <Button variant="primary" onClick={wallet.openModal}>Connect wallet to launch</Button>
              ) : !wallet.isDemo && !deployment ? (
                <Button variant="primary" disabled>Launch unavailable on {NETWORKS[draft.chain].name}</Button>
              ) : !wallet.isDemo && !lp.onChain ? (
                <Button variant="primary" loading={switching} onClick={() => void switchNetwork()}>Switch to {NETWORKS[draft.chain].name}{deployment?.testnet ? ' testnet' : ''}</Button>
              ) : !wallet.isDemo ? (
                <Button variant="gold" disabled={!ack || Boolean(onchainProblem)} onClick={() => void deploy()}><Rocket className="h-4 w-4" /> Launch {draft.symbol || 'token'} on-chain</Button>
              ) : (
                <Button variant="gold" disabled={!ack} onClick={() => void deploy()}><Rocket className="h-4 w-4" /> Launch {draft.symbol || 'token'}</Button>
              )}
            </div>
          )}
        </Card>
        <aside className="space-y-4">
          <PreviewCard d={draft} />
          <CurvePreview d={draft} />
        </aside>
      </div>
    </div>
  )
}

function Stepper({ step, done, onJump }: { step: number; done: boolean; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none" aria-label="Launch steps">
      {STEPS.map((s, i) => {
        const complete = i < step || done
        const current = i === step && !done
        return (
          <li key={s} className="flex items-center gap-1">
            <button type="button" onClick={() => onJump(i)} disabled={!complete || done} aria-current={current ? 'step' : undefined} className={cn('flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', current ? 'border-primary/60 bg-primary/10 text-fg' : complete ? 'border-up/30 text-fg hover:bg-white/5' : 'border-line text-subtle')}>
              <span className={cn('grid h-4 w-4 place-items-center rounded-full text-[10px]', complete ? 'bg-up/20 text-up' : current ? 'bg-primary text-white' : 'bg-white/10')}>{complete ? <Check className="h-2.5 w-2.5" /> : i + 1}</span>
              {s}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-3 bg-line" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}

type StepProps = { d: LaunchDraft; set: <K extends keyof LaunchDraft>(k: K, v: LaunchDraft[K]) => void; errors: FieldErrors }

function DetailsStep({ d, set, errors }: StepProps) {
  const [logoError, setLogoError] = useState<string | null>(null)
  const onFile = (file: File | undefined) => {
    setLogoError(null)
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return setLogoError('Use a PNG, JPEG, WebP or GIF image')
    if (file.size > MAX_LOGO_BYTES) return setLogoError(`Image is ${(file.size / 1024).toFixed(0)}KB — the limit is 250KB`)
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' && set('logoDataUrl', reader.result)
    reader.onerror = () => setLogoError('Could not read that file')
    reader.readAsDataURL(file)
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          <TokenLogo src={d.logoDataUrl} symbol={d.symbol || '?'} size={72} />
          {d.logoDataUrl && <button type="button" onClick={() => set('logoDataUrl', null)} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-line bg-elevated text-muted hover:text-fg" aria-label="Remove logo"><X className="h-3 w-3" /></button>}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-white/5 focus-within:ring-2 focus-within:ring-primary/60">
            <ImagePlus className="h-4 w-4" aria-hidden /> {d.logoDataUrl ? 'Change logo' : 'Upload logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <p className="mt-1.5 text-xs text-muted">Square image, max 250KB. Optional — a monogram is used otherwise.</p>
          {(logoError || errors.logoDataUrl) && <p className="mt-1 text-xs text-down" role="alert">{logoError ?? errors.logoDataUrl}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Token name" htmlFor="name" error={errors.name} hint={`${d.name.length}/32`}>
          <input id="name" className="input" value={d.name} maxLength={32} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Aurora Protocol" aria-invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Ticker" htmlFor="symbol" error={errors.symbol}>
          <input id="symbol" className="input font-mono uppercase" value={d.symbol} maxLength={10} onChange={(e) => set('symbol', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="AUR" aria-invalid={Boolean(errors.symbol)} />
        </Field>
      </div>
      <Field label="Description" htmlFor="description" error={errors.description} hint={`${d.description.length}/500`}>
        <textarea id="description" className="input min-h-[110px] resize-y" value={d.description} maxLength={500} onChange={(e) => set('description', e.target.value)} placeholder="What is this token for? Who is behind it? Be specific — traders read this first." aria-invalid={Boolean(errors.description)} />
      </Field>
    </div>
  )
}

function LinksStep({ d, set, errors }: StepProps) {
  const fields = [
    { k: 'website', label: 'Website', ph: 'https://yourproject.xyz' },
    { k: 'twitter', label: 'X / Twitter', ph: 'https://x.com/yourproject' },
    { k: 'telegram', label: 'Telegram', ph: 'https://t.me/yourproject' },
    { k: 'discord', label: 'Discord', ph: 'https://discord.gg/invite' },
  ] as const
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Optional, but tokens without any links are flagged to traders as higher risk. Links must use https.</p>
      {fields.map((f) => (
        <Field key={f.k} label={f.label} htmlFor={f.k} error={errors[f.k]}>
          <input id={f.k} type="url" inputMode="url" className="input" value={d[f.k]} maxLength={200} onChange={(e) => set(f.k, e.target.value)} placeholder={f.ph} aria-invalid={Boolean(errors[f.k])} />
        </Field>
      ))}
    </div>
  )
}

const SUPPLY_PRESETS = [100_000_000, 1_000_000_000, 10_000_000_000]

function TokenomicsStep({ d, set, errors }: StepProps) {
  const liq = liquidityPct(d)
  const bars = [
    { label: 'Bonding curve', pct: d.curveAllocationPct, color: 'bg-primary' },
    { label: 'DEX liquidity (at graduation)', pct: liq, color: 'bg-gold' },
    { label: 'Creator', pct: d.creatorAllocationPct, color: 'bg-up' },
  ]
  return (
    <div className="space-y-6">
      <Field label="Total supply" htmlFor="supply" error={errors.totalSupply} hint={`${formatCompact(d.totalSupply)} tokens · ${decimalsFor(d.chain)} decimals on ${NETWORKS[d.chain].name}`}>
        <div className="flex flex-wrap gap-2">
          {SUPPLY_PRESETS.map((s) => <button key={s} type="button" onClick={() => set('totalSupply', s)} className={cn('num rounded-lg border px-3 py-2 text-sm', d.totalSupply === s ? 'border-primary/60 bg-primary/10' : 'border-line text-muted hover:text-fg')}>{formatCompact(s)}</button>)}
          <input id="supply" type="number" min={1_000_000} max={1_000_000_000_000} step={1_000_000} className="input num w-44" value={d.totalSupply} onChange={(e) => set('totalSupply', Math.round(Number(e.target.value) || 0))} aria-label="Custom total supply" />
        </div>
      </Field>
      <div>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>{bars.map((b) => <div key={b.label} className={b.color} style={{ width: `${Math.max(0, b.pct)}%` }} />)}</div>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          {bars.map((b) => <li key={b.label} className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-sm', b.color)} aria-hidden /><span className="text-muted">{b.label}</span><span className="num ml-auto font-medium">{b.pct}%</span></li>)}
        </ul>
      </div>
      <Slider id="curve" label="Sold on the bonding curve" value={d.curveAllocationPct} min={50} max={90} onChange={(v) => set('curveAllocationPct', v)} error={errors.curveAllocationPct} hint="Higher means more of the supply is distributed fairly before graduation." />
      <Slider id="creator" label="Creator allocation" value={d.creatorAllocationPct} min={0} max={10} step={0.5} onChange={(v) => set('creatorAllocationPct', v)} error={errors.creatorAllocationPct} hint="Capped at 10%. Traders see this on your token page." />
      {errors.liquidityAllocationPct && <p className="text-sm text-down" role="alert">{errors.liquidityAllocationPct}</p>}
      {liq < 10 && <p className="text-sm text-down" role="alert">DEX liquidity must be at least 10% — lower the curve or creator share.</p>}
    </div>
  )
}

function Slider({ id, label, value, min, max, step = 1, onChange, error, hint }: { id: string; label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; error?: string; hint?: string }) {
  return (
    <Field label={<span className="flex justify-between"><span>{label}</span><span className="num text-fg">{value}%</span></span>} htmlFor={id} error={error} hint={hint}>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#3B82F6]" />
    </Field>
  )
}

function SettingsStep({ d, set, errors, onchain }: StepProps & { onchain: boolean }) {
  const net = NETWORKS[d.chain]
  return (
    <div className="space-y-5">
      <Field label="Network" htmlFor="chain" error={errors.chain}>
        <div id="chain" role="radiogroup" aria-label="Network" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FILTER_CHAINS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={d.chain === c} onClick={() => set('chain', c)} className={cn('rounded-xl border px-3 py-2.5 text-left text-sm', d.chain === c ? 'border-primary/60 bg-primary/10' : 'border-line hover:bg-white/5')}>
              <div className="font-medium">{NETWORKS[c].name}</div>
              <div className="text-[11px] text-muted">Curve in {NETWORKS[c].curveQuote.symbol}{launchpadFor(c) ? ` · on-chain${launchpadFor(c)?.testnet ? ' (testnet)' : ''}` : ''}</div>
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Initial buy (${net.curveQuote.symbol})`} htmlFor="initial" error={errors.initialBuyQuote} hint={`Optional. Buys from your own curve at launch — ≈ ${formatUsd(d.initialBuyQuote * net.curveQuote.usdReference)} (reference price). ${onchain ? 'Paid from your wallet in the launch transaction.' : 'Paid from your demo balance.'}`}>
        <input id="initial" type="number" min={0} step={net.curveQuote.symbol === 'SOL' ? 0.1 : 0.01} className="input num" value={d.initialBuyQuote} onChange={(e) => set('initialBuyQuote', Math.max(0, Number(e.target.value) || 0))} />
      </Field>
      <Field label="Max slippage for the initial buy" htmlFor="slip" error={errors.slippageBps}>
        <select id="slip" className="input" value={d.slippageBps} onChange={(e) => set('slippageBps', Number(e.target.value))}>
          {[100, 300, 500, 1000].map((b) => <option key={b} value={b}>{b / 100}%</option>)}
        </select>
      </Field>
    </div>
  )
}

function ReviewStep({ d, ack, setAck, onchainProblem }: { d: LaunchDraft; ack: boolean; setAck: (v: boolean) => void; onchainProblem: string | null }) {
  const wallet = useWallet()
  const rows: [string, ReactNode][] = [
    ['Name', d.name], ['Ticker', d.symbol], ['Network', NETWORKS[d.chain].name],
    ['Total supply', formatCompact(d.totalSupply)], ['Curve / Liquidity / Creator', `${d.curveAllocationPct}% / ${liquidityPct(d)}% / ${d.creatorAllocationPct}%`],
    ['Initial buy', d.initialBuyQuote > 0 ? `${d.initialBuyQuote} ${NETWORKS[d.chain].curveQuote.symbol}` : 'None'],
    ['Links', [d.website, d.twitter, d.telegram, d.discord].filter(Boolean).length || 'None'],
  ]
  return (
    <div className="space-y-5">
      <dl className="divide-y divide-line rounded-xl border border-line">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm"><dt className="text-muted">{k}</dt><dd className="num text-right font-medium">{v}</dd></div>)}
      </dl>
      <p className="whitespace-pre-line break-words rounded-xl border border-line bg-bg-2/60 p-3 text-sm text-muted">{d.description}</p>
      <LaunchModeNotice d={d} realWallet={wallet.status === 'connected' && !wallet.isDemo} onchainProblem={onchainProblem} />
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#3B82F6]" />
        <span>I confirm the details are accurate, I have the right to use this name and logo, and I understand that launches cannot be edited or deleted. I have read the <Link href="/docs#guidelines" className="text-primary hover:underline">community guidelines</Link>.</span>
      </label>
    </div>
  )
}

function LaunchModeNotice({ d, realWallet, onchainProblem }: { d: LaunchDraft; realWallet: boolean; onchainProblem: string | null }) {
  const deployment = launchpadFor(d.chain)
  if (!realWallet) {
    return <Notice tone="demo">This launch is simulated: the token exists only in Achilyon&apos;s demo market and nothing is deployed on-chain.{d.creatorAllocationPct > 0 ? ' The creator allocation is shown on your token page but not credited to your demo balance.' : ''}</Notice>
  }
  if (!deployment) {
    const available = launchpadDeployments().map((x) => NETWORKS[x.chain].name)
    return (
      <Notice tone="warn" title={`On-chain launches aren't available on ${NETWORKS[d.chain].name}`}>
        {available.length ? `The Achilyon launchpad contract is deployed on ${available.join(', ')} for this environment — pick one of those in Launch settings.` : 'No launchpad contract is configured for this environment, so a launch would have to be faked — we don’t do that.'} Connect the demo wallet to try the full flow with simulated funds.
      </Notice>
    )
  }
  return (
    <div className="space-y-3">
      <Notice tone="warn" title={`Real transaction on ${NETWORKS[d.chain].name}${deployment.testnet ? ' testnet' : ''}`}>
        Your wallet will ask you to sign a <span className="font-mono">createToken</span> transaction{d.initialBuyQuote > 0 ? ` that also spends ${d.initialBuyQuote} ${NETWORKS[d.chain].curveQuote.symbol} on your initial buy` : ''}, plus network gas. It cannot be undone. The name, ticker, description and links are stored on-chain; the logo is not (no image hosting is configured).
        {d.creatorAllocationPct > 0 ? ` Your ${d.creatorAllocationPct}% creator allocation is transferred to your wallet at launch.` : ''}
      </Notice>
      {onchainProblem && <Notice tone="danger">{onchainProblem}</Notice>}
    </div>
  )
}

function SuccessStep({ token, hash, onAnother }: { token: LaunchedToken; hash: string | null; onAnother: () => void }) {
  return (
    <div className="space-y-5 text-center sm:text-left">
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative"><TokenLogo src={token.logoUrl} symbol={token.symbol} size={64} /><PartyPopper className="absolute -right-2 -top-2 h-5 w-5 text-gold" aria-hidden /></div>
        <div>
          <div className="font-display text-xl font-semibold">{token.name} ({token.symbol})</div>
          <div className="text-sm text-muted">Live on its bonding curve · {NETWORKS[token.chain].name}{token.priceUsd !== null ? ` · starting price ${formatPrice(token.priceUsd)}` : ''}</div>
          {token.onchain && <div className="mt-1 break-all font-mono text-xs text-muted">{token.address}</div>}
        </div>
      </div>
      {hash && (token.onchain
        ? <p className="text-xs text-muted">Confirmed on-chain in tx <span className="font-mono">{hash.slice(0, 18)}…</span>. The token page may take a few seconds to show it.</p>
        : <p className="text-xs text-muted">Simulated launch tx <span className="font-mono">{hash.slice(0, 18)}…</span> — demo launches are not broadcast on-chain.</p>)}
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        <ButtonLink href={tokenPath(token.chain, token.address)} variant="primary">View token page</ButtonLink>
        {!token.onchain && <ButtonLink href="/my-tokens">My tokens</ButtonLink>}
        <Button variant="ghost" onClick={onAnother}>Launch another</Button>
      </div>
    </div>
  )
}

function PreviewCard({ d }: { d: LaunchDraft }) {
  return (
    <Card className="p-4">
      <div className="label mb-3">Preview</div>
      <div className="flex items-center gap-3">
        <TokenLogo src={d.logoDataUrl} symbol={d.symbol || '?'} size={44} />
        <div className="min-w-0">
          <div className="truncate font-semibold">{d.name || 'Token name'}</div>
          <div className="font-mono text-xs text-muted">{d.symbol || 'TICKER'} · {NETWORKS[d.chain].name}</div>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted">{d.description || 'Your description appears here.'}</p>
    </Card>
  )
}

function CurvePreview({ d }: { d: LaunchDraft }) {
  const net = NETWORKS[d.chain]
  const view = useMemo(() => {
    if (!(d.totalSupply >= 1_000_000) || d.curveAllocationPct < 50) return null
    const config = launchCurveConfig(net.curveQuote.symbol, net.curveQuote.usdReference, d.totalSupply, d.curveAllocationPct)
    const s = summarizeCurve(curveAt(config, 0))
    const buy = d.initialBuyQuote > 0 ? quoteBuy(curveAt(config, 0), d.initialBuyQuote) : null
    return { s, buy }
  }, [d.totalSupply, d.curveAllocationPct, d.initialBuyQuote, net])
  if (!view) return null
  const { s, buy } = view
  return (
    <Card className="p-4">
      <div className="label mb-3">Curve economics</div>
      <dl className="space-y-2 text-[13px]">
        <div className="flex justify-between"><dt className="text-muted">Starting price</dt><dd className="num">{formatPrice(s.priceUsd)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Starting market cap</dt><dd className="num">{formatUsdCompact(s.marketCapUsd)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Graduates at</dt><dd className="num">{formatUsdCompact(s.migrationMarketCapUsd)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Raise to graduate</dt><dd className="num">{formatCompact(s.migrationQuoteTarget, 3)} {net.curveQuote.symbol}</dd></div>
        {buy && (
          <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">Your initial buy</dt><dd className="num text-right">{formatCompact(buy.tokensOut)} tokens<br /><span className="text-[11px] text-muted">{((buy.tokensOut / d.totalSupply) * 100).toFixed(2)}% of supply</span></dd></div>
        )}
      </dl>
      {buy && buy.tokensOut / d.totalSupply > 0.05 && <p className="mt-3 flex gap-1.5 text-[11px] text-warn"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />Large creator buys are shown to traders and reduce trust.</p>}
      <p className="mt-3 text-[11px] text-subtle">USD values use reference {net.curveQuote.symbol} price ${net.curveQuote.usdReference.toLocaleString()}. <Link href="/docs#bonding-curve" className="text-primary hover:underline">Curve maths</Link></p>
    </Card>
  )
}
