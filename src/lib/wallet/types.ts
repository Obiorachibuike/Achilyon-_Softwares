/**
 * Wallet abstraction. The UI talks to `WalletConnector`s — never to a
 * specific provider SDK — so MetaMask, Coinbase Wallet, Rabby, WalletConnect
 * and the demo wallet are interchangeable.
 *
 * Security: connectors never expose or persist private keys or seed phrases,
 * and only request the permissions needed (accounts, chain switching, signing).
 */

export type ConnectorKind = 'injected' | 'walletconnect' | 'mock'

export interface ConnectorInfo {
  id: string
  name: string
  kind: ConnectorKind
  icon?: string
  /** Whether this connector can be used in the current environment. */
  available: boolean
  /** Reason shown when unavailable. */
  unavailableReason?: string
}

export interface ConnectResult {
  address: string
  evmChainId: number | null
}

export interface WalletConnector {
  info: ConnectorInfo
  connect(): Promise<ConnectResult>
  disconnect(): Promise<void>
  signMessage(address: string, message: string): Promise<string>
  switchChain?(evmChainId: number): Promise<void>
  /** Subscribe to account / chain changes. Returns an unsubscribe function. */
  subscribe?(handlers: { onAccounts: (accounts: string[]) => void; onChain: (evmChainId: number) => void }): () => void
}

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface WalletState {
  status: WalletStatus
  address: string | null
  evmChainId: number | null
  connectorId: string | null
  isDemo: boolean
  error: string | null
}

export type WalletAction =
  | { type: 'CONNECT_START'; connectorId: string }
  | { type: 'CONNECT_SUCCESS'; address: string; evmChainId: number | null; isDemo: boolean }
  | { type: 'CONNECT_ERROR'; error: string }
  | { type: 'ACCOUNT_CHANGED'; address: string | null }
  | { type: 'CHAIN_CHANGED'; evmChainId: number }
  | { type: 'DISCONNECT' }

export class WalletError extends Error {
  constructor(message: string, readonly code: 'USER_REJECTED' | 'NO_PROVIDER' | 'UNSUPPORTED' | 'UNKNOWN') {
    super(message)
    this.name = 'WalletError'
  }
}
