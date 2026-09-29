import { describe, expect, it } from 'vitest'
import { canTransition, INITIAL_TX_STATE, isBusy, txReducer, type TxEvent, type TxState } from './stateMachine'

const run = (events: TxEvent[], from: TxState = INITIAL_TX_STATE) => events.reduce(txReducer, from)

describe('transaction state machine', () => {
  it('walks the happy path to confirmed', () => {
    const s = run([{ type: 'START', simulated: true, at: 1 }, { type: 'REQUEST_SIGNATURE', at: 2 }, { type: 'SUBMITTED', hash: '0xabc', at: 3 }, { type: 'CONFIRMED', at: 4 }])
    expect(s).toMatchObject({ phase: 'confirmed', hash: '0xabc', simulated: true, startedAt: 1, updatedAt: 4, error: null })
  })

  it('never reaches confirmed without being submitted', () => {
    expect(run([{ type: 'CONFIRMED' }]).phase).toBe('idle')
    expect(run([{ type: 'START', simulated: false }, { type: 'CONFIRMED' }]).phase).toBe('preparing')
    expect(run([{ type: 'START', simulated: false }, { type: 'REQUEST_SIGNATURE' }, { type: 'CONFIRMED' }]).phase).toBe('awaiting_signature')
    expect(canTransition('awaiting_signature', 'CONFIRMED')).toBe(false)
  })

  it('handles wallet rejection and failures', () => {
    const rejected = run([{ type: 'START', simulated: false }, { type: 'REQUEST_SIGNATURE' }, { type: 'REJECTED' }])
    expect(rejected.phase).toBe('rejected')
    expect(rejected.error).toMatch(/rejected/)
    const failed = run([{ type: 'START', simulated: false }, { type: 'REQUEST_SIGNATURE' }, { type: 'SUBMITTED', hash: '0x1' }, { type: 'FAILED', error: 'reverted' }])
    expect(failed).toMatchObject({ phase: 'failed', error: 'reverted', hash: '0x1' })
    expect(canTransition('processing', 'REJECTED')).toBe(false)
  })

  it('can retry after a terminal state and reset from anywhere', () => {
    const failed = run([{ type: 'START', simulated: false }, { type: 'FAILED', error: 'x' }])
    const retry = txReducer(failed, { type: 'START', simulated: true })
    expect(retry).toMatchObject({ phase: 'preparing', error: null, hash: null })
    expect(txReducer(retry, { type: 'RESET' })).toEqual(INITIAL_TX_STATE)
  })

  it('reports busy phases', () => {
    expect(['preparing', 'awaiting_signature', 'processing'].every((p) => isBusy(p as TxState['phase']))).toBe(true)
    expect(isBusy('idle') || isBusy('confirmed') || isBusy('failed')).toBe(false)
  })
})
