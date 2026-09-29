'use client'
import { Check, Loader2, X } from 'lucide-react'
import type { ChainId } from '@/types'
import type { TxState } from '@/lib/transactions/stateMachine'
import { explorerTxUrl, explorerName } from '@/lib/blockchain/explorers'
import { shortAddress } from '@/lib/format'
import { cn } from '@/lib/cn'

const STEPS = [
  { phase: 'preparing', label: 'Preparing' },
  { phase: 'awaiting_signature', label: 'Confirm in wallet' },
  { phase: 'processing', label: 'Processing' },
  { phase: 'confirmed', label: 'Confirmed' },
] as const

const ORDER: Record<string, number> = { idle: -1, preparing: 0, awaiting_signature: 1, processing: 2, confirmed: 3 }

/**
 * Transaction progress for trades and launches. Driven entirely by the
 * tx state machine — "Confirmed" only renders after settlement.
 */
export function TxProgress({ state, chain, className }: { state: TxState; chain: ChainId; className?: string }) {
  if (state.phase === 'idle') return null
  const failed = state.phase === 'failed' || state.phase === 'rejected'
  // For failures, show progress up to the last reached step.
  const reached = failed ? (state.hash ? 2 : 1) : ORDER[state.phase] ?? -1
  const url = state.hash ? explorerTxUrl(chain, state.hash, state.simulated ? 'demo' : 'live') : null
  return (
    <div className={cn('rounded-xl border border-line bg-bg-2/70 p-3', className)} role="status" aria-live="polite">
      <ol className="space-y-2">
        {STEPS.map((s, i) => {
          const done = !failed && (state.phase === 'confirmed' || i < reached)
          const active = !failed && i === reached && state.phase !== 'confirmed'
          const errored = failed && i === reached
          return (
            <li key={s.phase} className={cn('flex items-center gap-2.5 text-[13px]', done || active ? 'text-fg' : errored ? 'text-down' : 'text-subtle')}>
              <span className={cn('grid h-5 w-5 place-items-center rounded-full border', done ? 'border-up/40 bg-up/15 text-up' : active ? 'border-primary/50 text-primary' : errored ? 'border-down/50 bg-down/10' : 'border-line')}>
                {done ? <Check className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : errored ? <X className="h-3 w-3" /> : <span className="h-1 w-1 rounded-full bg-current" />}
              </span>
              {errored ? (state.phase === 'rejected' ? 'Rejected' : 'Failed') : s.label}
              {s.phase === 'awaiting_signature' && active && state.simulated && <span className="text-[11px] text-muted">(demo wallet signs automatically)</span>}
            </li>
          )
        })}
      </ol>
      {failed && state.error && <p className="mt-2.5 text-xs text-down">{state.error}</p>}
      {state.hash && (
        <p className="mt-2.5 text-xs text-muted">
          {state.simulated ? 'Simulated tx ' : 'Tx '}<span className="font-mono">{shortAddress(state.hash, 6)}</span>
          {url && <> · <a className="text-primary hover:underline" href={url} target="_blank" rel="noopener noreferrer">View on {explorerName(chain)}</a></>}
          {state.simulated && ' · demo trades are not broadcast to any blockchain'}
        </p>
      )}
    </div>
  )
}
