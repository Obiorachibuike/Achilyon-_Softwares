'use client'
import { useMemo, useReducer, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { formatUnits, type Address } from 'viem'
import { AlertTriangle, ArrowLeftRight, ExternalLink, GraduationCap, Info, Settings2, Wallet } from 'lucide-react'
import type { MarketToken, TradeSide } from '@/types'
import { INITIAL_TX_STATE, isBusy, PHASE_LABEL, txReducer } from '@/lib/transactions/stateMachine'
import { runTx } from '@/lib/transactions/runTx'
import { buyToken, deadlineIn, graduateToken, sellToken } from '@/lib/contracts/launchpad'
import { explorerAddressUrl, explorerName } from '@/lib/blockchain/explorers'
import type { LaunchpadDeployment } from '@/lib/contracts/deployments'
import { parseUnitsSafe, toUnits } from '@/lib/contracts/curveMath'
import { onchainQuote, QUOTE_PROBLEM } from '@/lib/contracts/tradeQuote'
import { contractErrorMessage, isUserRejection } from '@/lib/contracts/errors'
import { impactLevel } from '@/lib/market/tradeQuote'
import { NETWORKS } from '@/lib/blockchain/chains'
import { formatPrice, formatTokenAmount, formatUsd } from '@/lib/format'
import { useWallet } from '@/stores/wallet'
import { usePreferences } from '@/stores/preferences'
import { toast } from '@/stores/toast'
import { useLaunchpadWallet, useOnchainPosition } from '@/hooks/useLaunchpad'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/primitives'
import { Notice } from '@/components/ui/feedback'
import { TxProgress } from '@/components/tx/TxProgress'
import { cn } from '@/lib/cn'
import { QuoteRow as Row, SlippageSettings } from './tradeParts'

/** A token launched on the on-chain Achilyon launchpad (on its curve or graduated), not the demo simulation. */
export const isOnchainLaunch = (t: MarketToken) => t.source === 'live' && t.token.launchpad

const SHORTCUTS = [25, 50, 75, 100]
const TX_DEADLINE_SECONDS = 10 * 60
const fmtNative = (wei: bigint, symbol: string) => `${formatTokenAmount(toUnits(wei))} ${symbol}`

export function OnchainTradingPanel({ token: t, deployment: d }: { token: MarketToken; deployment: LaunchpadDeployment }) {
  const [side, setSide] = useState<TradeSide>('buy')
  const [raw, setRaw] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [confirmImpact, setConfirmImpact] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [tx, dispatch] = useReducer(txReducer, INITIAL_TX_STATE)
  const qc = useQueryClient()

  const wallet = useWallet()
  const { slippageBps, setSlippage, riskAcknowledged, acknowledgeRisk } = usePreferences()
  const [ackChecked, setAckChecked] = useState(false)
  const lp = useLaunchpadWallet(d)
  const position = useOnchainPosition(lp.client, d, t.token.address, lp.address)
  const curve = position.data?.curve ?? null
  const balances = position.data?.balances
  const symbol = d.nativeSymbol
  // USD per native coin, as priced by the server (live or reference rate).
  const quoteUsd = t.pair.priceNative > 0 ? t.market.priceUsd / t.pair.priceNative : 0
  const busy = isBusy(tx.phase)

  const amountWei = raw ? parseUnitsSafe(raw) : null
  const balance = side === 'buy' ? balances?.native : balances?.token
  const result = useMemo(
    () => (curve && amountWei !== null ? onchainQuote(curve, side, amountWei, slippageBps, balance) : null),
    [curve, amountWei, side, slippageBps, balance],
  )
  const quote = result && 'quote' in result ? result.quote : null
  const problem = raw && amountWei === null ? 'Enter a valid amount' : result && 'problem' in result ? QUOTE_PROBLEM[result.problem] : null
  const impact = quote ? impactLevel(quote.priceImpactPct) : 'ok'

  const changeSide = (s: TradeSide) => {
    if (busy) return
    setSide(s)
    setRaw('')
    setConfirmImpact(false)
    if (tx.phase !== 'idle') dispatch({ type: 'RESET' })
  }

  const shortcut = (pct: number) => {
    if (balance === undefined) return
    // Keep ~2% of the native balance for gas when buying.
    const base = side === 'buy' ? (balance * 98n) / 100n : balance
    setRaw(formatUnits((base * BigInt(pct)) / 100n, 18))
    setConfirmImpact(false)
  }

  const execute = async () => {
    if (!quote || !lp.client || problem) return
    const client = lp.client
    const token = t.token.address as Address
    const deadline = deadlineIn(TX_DEADLINE_SECONDS)
    const res = await runTx(
      dispatch,
      (hooks) =>
        quote.side === 'buy'
          ? buyToken(client, { token, quoteIn: quote.amountIn, minTokensOut: quote.minOut, deadline }, hooks)
          : sellToken(client, { token, amount: quote.amountIn, minQuoteOut: quote.minOut, deadline }, hooks),
      { isRejection: isUserRejection, message: contractErrorMessage },
    )
    if (!res) return
    toast.success(
      quote.side === 'buy' ? `Bought ${formatTokenAmount(toUnits(res.tokenAmount))} ${t.token.symbol}` : `Sold ${formatTokenAmount(toUnits(res.tokenAmount))} ${t.token.symbol}`,
      `Confirmed on-chain · ${fmtNative(res.quoteAmount, symbol)}`,
    )
    setRaw('')
    setConfirmImpact(false)
    void position.refetch()
    void qc.invalidateQueries({ queryKey: ['token', t.token.chain] })
    void qc.invalidateQueries({ queryKey: ['trades', t.token.chain] })
    void qc.invalidateQueries({ queryKey: ['wallet-tx'] })
  }

  const graduate = async () => {
    if (!lp.client) return
    const res = await runTx(dispatch, (hooks) => graduateToken(lp.client!, t.token.address as Address, hooks), { isRejection: isUserRejection, message: contractErrorMessage })
    if (!res) return
    toast.success(`${t.token.symbol} graduated to ${d.dexName}`, `${fmtNative(res.quoteAmount, symbol)} and ${formatTokenAmount(toUnits(res.tokenAmount))} ${t.token.symbol} moved into the pool; LP tokens burned.`)
    void position.refetch()
    void qc.invalidateQueries({ queryKey: ['token', t.token.chain] })
  }

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

  const networkName = `${NETWORKS[d.chain].name}${d.testnet ? ' testnet' : ''}`
  let action: React.ReactNode
  if (wallet.status !== 'connected') {
    action = <Button className="w-full" size="lg" variant="primary" onClick={wallet.openModal}><Wallet className="h-4 w-4" /> Connect wallet</Button>
  } else if (wallet.isDemo) {
    action = <Notice tone="info" title="Real wallet required">This token trades on the Achilyon launchpad contract on {networkName}. The demo wallet cannot sign transactions — connect a browser wallet to trade.</Notice>
  } else if (!lp.ready) {
    action = <Notice tone="warn" title="Wallet unavailable">Your wallet provider could not be reached. Reconnect it and try again.</Notice>
  } else if (!lp.onChain) {
    action = (
      <Button className="w-full" size="lg" variant="primary" loading={switching} onClick={() => void switchNetwork()}>
        <ArrowLeftRight className="h-4 w-4" /> Switch to {networkName}
      </Button>
    )
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
  } else if (position.isError) {
    action = <Notice tone="danger" title="Could not read the contract">{contractErrorMessage(position.error)} <button type="button" className="underline" onClick={() => void position.refetch()}>Retry</button></Notice>
  } else {
    const needsConfirm = impact === 'extreme' && !confirmImpact
    action = (
      <Button className="w-full" size="lg" variant={side === 'buy' ? 'buy' : 'sell'} loading={busy || position.isLoading} disabled={busy || !raw || !quote || Boolean(problem) || needsConfirm} onClick={() => void execute()}>
        {busy ? PHASE_LABEL[tx.phase] : problem && raw ? problem : needsConfirm ? 'Confirm high price impact' : `${side === 'buy' ? 'Buy' : 'Sell'} ${t.token.symbol}`}
      </Button>
    )
  }

  const graduated = curve?.migrated ?? t.token.status === 'migrated'
  const complete = graduated || (curve?.complete ?? false)
  if (complete) {
    const poolUrl = graduated && t.pair.dexId !== 'achilyon' ? explorerAddressUrl(t.token.chain, t.pair.address) : null
    let gradAction: React.ReactNode = null
    if (!graduated) {
      if (wallet.status !== 'connected') gradAction = <Button className="w-full" variant="primary" onClick={wallet.openModal}><Wallet className="h-4 w-4" /> Connect wallet to graduate</Button>
      else if (wallet.isDemo || !lp.ready) gradAction = <p className="text-xs text-muted">Connect a browser wallet on {networkName} to trigger graduation.</p>
      else if (!lp.onChain) gradAction = <Button className="w-full" variant="primary" loading={switching} onClick={() => void switchNetwork()}><ArrowLeftRight className="h-4 w-4" /> Switch to {networkName}</Button>
      else gradAction = <Button className="w-full" variant="gold" loading={busy} disabled={busy || tx.phase === 'confirmed'} onClick={() => void graduate()}><GraduationCap className="h-4 w-4" /> {busy ? PHASE_LABEL[tx.phase] : `Graduate to ${d.dexName}`}</Button>
    }
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 font-display text-base font-semibold"><GraduationCap className="h-5 w-5 text-gold" aria-hidden /> {graduated ? `Graduated to ${d.dexName}` : 'Bonding curve complete'}</div>
        {graduated ? (
          <div className="mt-3 space-y-3 text-sm text-muted">
            <p>The curve&apos;s {symbol} and liquidity tokens were moved into a {d.dexName} pool at the curve&apos;s final price, and the LP tokens were burned, so that liquidity can never be withdrawn.</p>
            <p>Achilyon doesn&apos;t route DEX swaps yet. Trade this token in the pool with any {d.dexName}-compatible interface.</p>
            {poolUrl && <a href={poolUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-primary hover:underline">View pool on {explorerName(t.token.chain)} <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>}
          </div>
        ) : (
          <div className="mt-3 space-y-3 text-sm text-muted">
            <p>Every curve token has been sold, so buying and selling on the curve are closed. The next step moves the raised {symbol} and the liquidity allocation into a {d.dexName} pool at the curve&apos;s final price and burns the LP tokens.</p>
            <p>Anyone can trigger this. Whoever does pays the gas, which is higher than a trade because it creates the pool.</p>
            {gradAction}
          </div>
        )}
        <TxProgress state={tx} chain={t.token.chain} className="mt-3" />
      </Card>
    )
  }

  const canUseBalance = Boolean(lp.client && balance !== undefined && balance > 0n)
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
          {balances && <span className="num">Balance: {side === 'buy' ? fmtNative(balances.native, symbol) : `${formatTokenAmount(toUnits(balances.token))} ${t.token.symbol}`}</span>}
        </div>
        <div className="flex items-center rounded-xl border border-line bg-bg-2 focus-within:border-primary/60">
          <input
            id="trade-amount" inputMode="decimal" autoComplete="off" placeholder="0.00" value={raw} disabled={busy}
            onChange={(e) => { const v = e.target.value.replace(',', '.'); if (/^\d*\.?\d*$/.test(v)) { setRaw(v); setConfirmImpact(false) } }}
            className="num min-w-0 flex-1 bg-transparent px-3 py-3 text-lg outline-none" aria-invalid={Boolean(problem)} aria-describedby="trade-quote"
          />
          <span className="pr-3 text-sm font-medium text-muted">{side === 'buy' ? symbol : t.token.symbol}</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {SHORTCUTS.map((p) => (
            <button key={p} type="button" disabled={busy || !canUseBalance} onClick={() => shortcut(p)} title={side === 'buy' && p === 100 ? 'Keeps about 2% of your balance for gas' : undefined} className="num rounded-lg border border-line py-1.5 text-xs text-muted hover:bg-white/5 hover:text-fg disabled:opacity-40">
              {p === 100 ? 'MAX' : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      <dl id="trade-quote" className="mt-4 space-y-1.5 text-[13px]">
        <Row label="You receive" value={quote ? (side === 'buy' ? `${formatTokenAmount(toUnits(quote.amountOut))} ${t.token.symbol}` : fmtNative(quote.amountOut, symbol)) : '—'} strong />
        <Row label={`Min received (${slippageBps / 100}% slippage)`} value={quote ? (side === 'buy' ? `${formatTokenAmount(toUnits(quote.minOut))} ${t.token.symbol}` : fmtNative(quote.minOut, symbol)) : '—'} />
        <Row label="Avg price" value={quote ? formatPrice(quote.avgPriceQuote * quoteUsd) : formatPrice(t.market.priceUsd)} />
        <Row label="Price impact" value={quote ? <span className={cn(impact === 'extreme' ? 'text-down' : impact === 'high' ? 'text-warn' : 'text-fg')}>{quote.priceImpactPct.toFixed(2)}%</span> : '—'} />
        <Row label={`Fee (${(curve?.feeBps ?? t.curve?.feeBps ?? 0) / 100}%)`} value={quote ? `${fmtNative(quote.fee, symbol)} · ${formatUsd(toUnits(quote.fee) * quoteUsd)}` : '—'} />
        <Row label="Route" value="Achilyon launchpad contract" />
      </dl>

      {quote?.capped && <Notice tone="info" className="mt-3" icon={<Info className="h-4 w-4" />}>This order completes the curve. Only {fmtNative(quote.amountIn - quote.refund, symbol)} is used; the remaining {fmtNative(quote.refund, symbol)} is refunded in the same transaction.</Notice>}
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
      <p className="mt-3 text-center text-[11px] text-subtle">
        Real transaction on {networkName}{d.testnet ? ' (test funds)' : ''}. Quotes are exact for the current curve; your wallet shows the final amount before you sign.
      </p>
    </Card>
  )
}
