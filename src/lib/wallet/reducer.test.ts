import { describe, expect, it } from 'vitest'
import { INITIAL_WALLET_STATE, walletReducer } from './reducer'
import type { WalletAction, WalletState } from './types'

const run = (actions: WalletAction[], from: WalletState = INITIAL_WALLET_STATE) => actions.reduce(walletReducer, from)
const ADDR = '0x1111111111111111111111111111111111111111'

describe('wallet reducer', () => {
  it('connects', () => {
    expect(run([{ type: 'CONNECT_START', connectorId: 'injected' }]).status).toBe('connecting')
    const s = run([{ type: 'CONNECT_START', connectorId: 'injected' }, { type: 'CONNECT_SUCCESS', address: ADDR, evmChainId: 8453, isDemo: false }])
    expect(s).toEqual({ status: 'connected', address: ADDR, evmChainId: 8453, connectorId: 'injected', isDemo: false, error: null })
  })

  it('ignores a late success after the attempt was abandoned', () => {
    const s = run([{ type: 'CONNECT_START', connectorId: 'injected' }, { type: 'DISCONNECT' }, { type: 'CONNECT_SUCCESS', address: ADDR, evmChainId: 1, isDemo: false }])
    expect(s.status).toBe('disconnected')
  })

  it('records errors without keeping stale addresses', () => {
    const s = run([{ type: 'CONNECT_START', connectorId: 'injected' }, { type: 'CONNECT_ERROR', error: 'User rejected' }])
    expect(s).toMatchObject({ status: 'error', address: null, error: 'User rejected' })
  })

  it('follows account and chain changes, disconnecting when the wallet locks', () => {
    const connected = run([{ type: 'CONNECT_START', connectorId: 'mock' }, { type: 'CONNECT_SUCCESS', address: ADDR, evmChainId: 1, isDemo: true }])
    expect(walletReducer(connected, { type: 'CHAIN_CHANGED', evmChainId: 137 }).evmChainId).toBe(137)
    expect(walletReducer(connected, { type: 'ACCOUNT_CHANGED', address: '0x2222222222222222222222222222222222222222' }).address).toMatch(/^0x2/)
    expect(walletReducer(connected, { type: 'ACCOUNT_CHANGED', address: null })).toEqual(INITIAL_WALLET_STATE)
    expect(walletReducer(INITIAL_WALLET_STATE, { type: 'CHAIN_CHANGED', evmChainId: 5 })).toBe(INITIAL_WALLET_STATE)
  })
})
