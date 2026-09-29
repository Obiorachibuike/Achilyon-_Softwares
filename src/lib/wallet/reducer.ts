import type { WalletAction, WalletState } from './types'

export const INITIAL_WALLET_STATE: WalletState = {
  status: 'disconnected',
  address: null,
  evmChainId: null,
  connectorId: null,
  isDemo: false,
  error: null,
}

/** Pure wallet state transitions (kept separate from React for testing). */
export function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case 'CONNECT_START':
      return { ...INITIAL_WALLET_STATE, status: 'connecting', connectorId: action.connectorId }
    case 'CONNECT_SUCCESS':
      if (state.status !== 'connecting') return state
      return { ...state, status: 'connected', address: action.address, evmChainId: action.evmChainId, isDemo: action.isDemo, error: null }
    case 'CONNECT_ERROR':
      return { ...INITIAL_WALLET_STATE, status: 'error', error: action.error }
    case 'ACCOUNT_CHANGED':
      if (state.status !== 'connected') return state
      // Wallet locked or all accounts disconnected from the site.
      if (!action.address) return INITIAL_WALLET_STATE
      return { ...state, address: action.address }
    case 'CHAIN_CHANGED':
      return state.status === 'connected' ? { ...state, evmChainId: action.evmChainId } : state
    case 'DISCONNECT':
      return INITIAL_WALLET_STATE
    default:
      return state
  }
}
