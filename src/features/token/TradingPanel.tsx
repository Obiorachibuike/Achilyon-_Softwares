'use client'
import { useMemo, useReducer, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Info, Settings2, Wallet } from 'lucide-react'
import type { MarketToken, MarketTrade, TradeSide } from '@/types'
import { INITIAL_TX_STATE, isBusy, PHASE_LABEL, txReducer } from '@/lib/transactions/stateMachine'
import { fractionOf, impactLevel, quoteTrade } from '@/lib/market/tradeQuote'
import { formatPrice, formatTokenAmount, formatUsd } from '@/lib/format'
import { api, errorMessage } from '@/lib/api/client'
import { useWallet } from '@/stores/wallet'
import { usePreferences } from '@/stores/preferences'
import { toast } from '@/stores/toast'
import { useDemoBalance } from '@/hooks/useMarket'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/primitives'
import { Notice } from '@/components/ui/feedback'
import { TxProgress } from '@/components/tx/TxProgress'
import { cn } from '@/lib/cn'
import { launchpadFor } from '@/lib/contracts/deployments'
import { QuoteRow as Row, SlippageSettings } from './tradeParts'
import { OnchainTradingPanel, isOnchainLaunch } from './OnchainTradingPanel'

const SHORTCUTS = [25, 50, 75, 100]
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function TradingPanel({ token: t }: { token: MarketToken }) {
  const deployment = launchpadFor(t.token.chain)
  if (deployment && isOnchainLaunch(t)) return <OnchainTradingPanel token={t} deployment={deployment} />
  return <SimulatedTradingPanel token={t} />
}

/** Demo-wallet trading against the simulated market, and the "not enabled" state for real wallets. */
function SimulatedTradingPanel({ token: t }: { token: MarketToken }) {
  const [side, setSide] = useState<TradeSide>('buy')
  const [raw, setRaw] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [confirmImpact, setConfirmImpact] = useState(false)
  const [tx, dispatch] = useReducer(txReducer, INITIAL_TX_STATE)
  const qc = useQueryClient()

  const wallet = useWallet()
  const { slippageBps, setSlippage, riskAcknowledged, acknowledgeRisk } = usePreferences()
  const [ackChecked, setAckChecked] = useState(false)
  const connected = wallet.status === 'connected'
  const demoTradable = t.source === 'demo'
  const balance = useDemoBalance(t.token.chain, t.token.address)

  const amount = Number(raw)
  const available = side === 'buy' ? balance.data?.cashUsd ?? 0 : balance.data?.tokenAmount ?? 0
  const quote = useMemo(() => quoteTrade(t, side, amount, slippageBps), [t, side, amount, slippageBps])
  const impact = quote ? impactLevel(quote.priceImpactPct) : 'ok'
  const busy = isBusy(tx.phase)

  const problem = (() => {
    if (!raw) return null
    if (!(amount > 0)) return 'Enter an amount greater than zero'
    if (wallet.isDemo && balance.data && amount > available + 1e-9) return side === 'buy' ? 'Amount exceeds your demo balance' : 'Amount exceeds your token balance'
    if (!quote) return 'No quote available for this amount'
    return null
  })()

  const changeSide = (s: TradeSide) => {
    if (busy) return
    setSide(s)
    setRaw('')
    setConfirmImpact(false)
    if (tx.phase !== 'idle') dispatch({ type: 'RESET' })
  }

  const execute = async () => {
    if (!quote || problem) return
    dispatch({ type: 'START', simulated: true })
    try {
      const session = await wallet.ensureSession()
      if (!session?.demo) throw new Error('Sign in with the demo wallet to place simulated trades')
      dispatch({ type: 'REQUEST_SIGNATURE' })
      await sleep(600) // the demo wallet "signs" instantly; the pause keeps the step visible
      dispatch({ type: 'SUBMITTED' })
      const res = await api.post<{ trade: MarketTrade; token: MarketToken }>('/api/trade', {
        chain: t.token.chain, address: t.token.address, side, amount, slippageBps,
      })
      dispatch({ type: 'CONFIRMED', hash: res.trade.hash })
      toast.success(`${side === 'buy' ? 'Bought' : 'Sold'} ${formatTokenAmount(res.trade.amountToken)} ${t.token.symbol}`, `Simulated fill at ${formatPrice(res.trade.priceUsd)} · ${formatUsd(res.trade.amountUsd)}`)
      setRaw('')
      setConfirmImpact(false)
      void qc.invalidateQueries({ queryKey: ['demo-balance'] })
      void qc.invalidateQueries({ queryKey: ['token', t.token.chain] })
      void qc.invalidateQueries({ queryKey: ['trades', t.token.chain] })
      void qc.invalidateQueries({ queryKey: ['portfolio'] })
      void qc.invalidateQueries({ queryKey: ['wallet-tx'] })
    } catch (e) {
      dispatch({ type: 'FAILED', error: errorMessage(e) })
    }
  }

  const unit = side === 'buy' ? 'USD' : t.token.symbol

  let action: React.ReactNode
  if (!connected) {
    action = <Button className="w-full" size="lg" variant="primary" onClick={wallet.openModal}><Wallet className="h-4 w-4" /> Connect wallet</Button>
  } else if (!wallet.isDemo) {
    action = (
      <Notice tone="info" title="On-chain trading not available for this market">
        {t.token.launchpad
          ? 'The Achilyon launchpad contract is not configured for this network on this deployment. '
          : 'Achilyon executes on-chain trades only on its own bonding curves; DEX swaps need a router integration that is not configured. '}
        Quotes above are estimates only. Connect the demo wallet to practise with simulated funds.
      </Notice>
    )
  } else if (!demoTradable) {
    action = <Notice tone="info" title="Not tradable in demo">This is a live DEX market. The demo wallet can only trade simulated Achilyon launchpad tokens.</Notice>
  } else if (!riskAcknowledged) {
    action = (
      <div className="space-y-3">
        <label className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <input type="checkbox" checked={ackChecked} onChange={(e) => setAckChecked(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#3B82F6]" />
          I understand new tokens are highly speculative, can lose all value, and nothing on Achilyon is financial advice.
        </label>
        <Button className="w-full" variant="primary" disabled={!ackChecked} onClick={acknowledgeRisk}>Continue</Button>
      </div>
    )
  } else {
    const needsConfirm = impact === 'extreme' && !confirmImpact
    action = (
      <Button
        className="w-full"
        size="lg"
        variant={side === 'buy' ? 'buy' : 'sell'}
        loading={busy}
        disabled={busy || !raw || Boolean(problem) || needsConfirm}
        onClick={() => void execute()}
      >
        {busy ? PHASE_LABEL[tx.phase] : problem && raw ? problem : needsConfirm ? 'Confirm high price impact' : `${side === 'buy' ? 'Buy' : 'Sell'} ${t.token.symbol}`}
      </Button>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div role="tablist" aria-label="Order side" className="grid flex-1 grid-cols-2 rounded-xl border border-line bg-bg-2 p-0.5">
          {(['buy', 'sell'] as const).map((s) => (
            <button key={s} role="tab" type="button" aria-selected={side === s} onClick={() => changeSide(s)} className={cn('rounded-[10px] py-2 text-sm font-semibold uppercase tracking-wide transition-colors', side === s ? (s === 'buy' ? 'bg-up/15 text-up' : 'bg-down/15 text-down') : 'text-muted hover:text-fg')}>
              {s}
            </button>
          ))}
        </div>
        <Button size="icon" variant="ghost" aria-label="Slippage settings" aria-expanded={showSettings} onClick={() => setShowSettings((v) => !v)}><Settings2 className="h-4 w-4" /></Button>
      </div>

      {showSettings && <SlippageSettings slippageBps={slippageBps} setSlippage={setSlippage} />}

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
          <label htmlFor="trade-amount">{side === 'buy' ? 'You pay' : 'You sell'}</label>
          {wallet.isDemo && balance.data && (
            <span className="num">Balance: {side === 'buy' ? formatUsd(balance.data.cashUsd) : `${formatTokenAmount(balance.data.tokenAmount)} ${t.token.symbol}`}</span>
          )}
        </div>
        <div className="flex items-center rounded-xl border border-line bg-bg-2 focus-within:border-primary/60">
          <input
            id="trade-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={raw}
            disabled={busy}
            onChange={(e) => { const v = e.target.value.replace(',', '.'); if (/^\d*\.?\d*$/.test(v)) { setRaw(v); setConfirmImpact(false) } }}
            className="num min-w-0 flex-1 bg-transparent px-3 py-3 text-lg outline-none"
            aria-invalid={Boolean(problem)}
            aria-describedby="trade-quote"
          />
          <span className="pr-3 text-sm font-medium text-muted">{unit}</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {SHORTCUTS.map((p) => (
            <button key={p} type="button" disabled={busy || !wallet.isDemo || !balance.data || available <= 0} onClick={() => setRaw(String(fractionOf(available, p)))} className="num rounded-lg border border-line py-1.5 text-xs text-muted hover:bg-white/5 hover:text-fg disabled:opacity-40" title={!wallet.isDemo ? 'Available with the demo wallet' : undefined}>
              {p === 100 ? 'MAX' : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      <dl id="trade-quote" className="mt-4 space-y-1.5 text-[13px]">
        <Row label="You receive" value={quote ? (side === 'buy' ? `${formatTokenAmount(quote.amountOut)} ${t.token.symbol}` : formatUsd(quote.amountOut)) : '—'} strong />
        <Row label={`Min received (${slippageBps / 100}% slippage)`} value={quote ? (side === 'buy' ? `${formatTokenAmount(quote.minReceived)} ${t.token.symbol}` : formatUsd(quote.minReceived)) : '—'} />
        <Row label="Avg price" value={quote ? formatPrice(quote.avgPriceUsd) : formatPrice(t.market.priceUsd)} />
        <Row
          label="Price impact"
          value={quote ? <span className={cn(impact === 'extreme' ? 'text-down' : impact === 'high' ? 'text-warn' : 'text-fg')}>{quote.priceImpactPct.toFixed(2)}%{impact !== 'ok' && ` · ${impact === 'extreme' ? 'very high' : 'high'}`}</span> : '—'}
        />
        <Row label={`Fee (${(quote?.feeBps ?? (t.curve?.feeBps ?? 30)) / 100}%)`} value={quote ? formatUsd(quote.feeUsd) : '—'} />
        <Row label="Route" value={quote?.venue === 'curve' || t.token.status === 'bonding' ? 'Achilyon bonding curve' : `${t.pair.dexName} pool (x·y=k est.)`} />
      </dl>

      {quote?.capped && <Notice tone="info" className="mt-3" icon={<Info className="h-4 w-4" />}>Order exceeds the remaining curve supply — only the fillable part would execute and the curve would graduate.</Notice>}
      {impact === 'high' && <Notice tone="warn" className="mt-3" icon={<AlertTriangle className="h-4 w-4" />}>Price impact above 5%. Consider a smaller order.</Notice>}
      {impact === 'extreme' && (
        <Notice tone="danger" className="mt-3" title="Very high price impact">
          <label className="mt-1 flex items-start gap-2">
            <input type="checkbox" checked={confirmImpact} onChange={(e) => setConfirmImpact(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#EF4444]" />
            I accept a {quote?.priceImpactPct.toFixed(1)}% price impact on this trade.
          </label>
        </Notice>
      )}

      <div className="mt-4">{action}</div>
      <TxProgress state={tx} chain={t.token.chain} className="mt-3" />
      {wallet.isDemo && demoTradable && <p className="mt-3 text-center text-[11px] text-subtle">Demo trades use simulated funds and never touch a blockchain.</p>}
    </Card>
  )
}
