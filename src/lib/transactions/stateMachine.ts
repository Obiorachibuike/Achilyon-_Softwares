/**
 * Transaction lifecycle state machine shared by trading and launching.
 *
 *   idle → preparing → awaiting_signature → processing → confirmed
 *                ↘            ↘                ↘
 *                 failed      rejected          failed
 *
 * "confirmed" may only be reached from "processing" — i.e. after the
 * transaction was submitted and a receipt (or demo settlement) was observed.
 * The UI never shows success for any other path.
 */

export type TxPhase = 'idle' | 'preparing' | 'awaiting_signature' | 'processing' | 'confirmed' | 'failed' | 'rejected'

export interface TxState {
  phase: TxPhase
  hash: string | null
  error: string | null
  startedAt: number | null
  updatedAt: number | null
  /** True when the transaction is simulated by the demo wallet. */
  simulated: boolean
}

export type TxEvent =
  | { type: 'START'; simulated: boolean; at?: number }
  | { type: 'REQUEST_SIGNATURE'; at?: number }
  | { type: 'SUBMITTED'; hash?: string; at?: number }
  | { type: 'CONFIRMED'; hash?: string; at?: number }
  | { type: 'REJECTED'; at?: number }
  | { type: 'FAILED'; error: string; at?: number }
  | { type: 'RESET' }

export const INITIAL_TX_STATE: TxState = { phase: 'idle', hash: null, error: null, startedAt: null, updatedAt: null, simulated: false }

const TRANSITIONS: Record<TxPhase, Partial<Record<TxEvent['type'], TxPhase>>> = {
  idle: { START: 'preparing' },
  preparing: { REQUEST_SIGNATURE: 'awaiting_signature', FAILED: 'failed', REJECTED: 'rejected' },
  awaiting_signature: { SUBMITTED: 'processing', REJECTED: 'rejected', FAILED: 'failed' },
  processing: { CONFIRMED: 'confirmed', FAILED: 'failed' },
  confirmed: { START: 'preparing' },
  failed: { START: 'preparing' },
  rejected: { START: 'preparing' },
}

export function canTransition(from: TxPhase, event: TxEvent['type']): boolean {
  return event === 'RESET' || Boolean(TRANSITIONS[from][event])
}

export function txReducer(state: TxState, event: TxEvent): TxState {
  if (event.type === 'RESET') return INITIAL_TX_STATE
  const next = TRANSITIONS[state.phase][event.type]
  if (!next) return state // invalid transitions are ignored, never forced
  const at = event.at ?? Date.now()
  switch (event.type) {
    case 'START':
      return { phase: next, hash: null, error: null, startedAt: at, updatedAt: at, simulated: event.simulated }
    case 'SUBMITTED':
    case 'CONFIRMED':
      return { ...state, phase: next, hash: event.hash ?? state.hash, updatedAt: at }
    case 'FAILED':
      return { ...state, phase: next, error: event.error, updatedAt: at }
    case 'REJECTED':
      return { ...state, phase: next, error: 'Request was rejected in the wallet', updatedAt: at }
    default:
      return { ...state, phase: next, updatedAt: at }
  }
}

export const isBusy = (phase: TxPhase) => phase === 'preparing' || phase === 'awaiting_signature' || phase === 'processing'

export const PHASE_LABEL: Record<TxPhase, string> = {
  idle: 'Ready',
  preparing: 'Preparing…',
  awaiting_signature: 'Confirm in wallet…',
  processing: 'Processing…',
  confirmed: 'Confirmed',
  failed: 'Failed',
  rejected: 'Rejected',
}
