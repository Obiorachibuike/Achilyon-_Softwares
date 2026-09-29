'use client'
import { create } from 'zustand'
import type { Session } from '@/types'
import type { ConnectorInfo, WalletAction, WalletState } from '@/lib/wallet/types'
import { INITIAL_WALLET_STATE, walletReducer } from '@/lib/wallet/reducer'
import { getConnector, getProvider, listConnectors } from '@/lib/wallet/registry'
import { getAuthorizedAccount } from '@/lib/wallet/connectors/injected'
import { signInMessage } from '@/lib/auth/message'
import { api, errorMessage } from '@/lib/api/client'

const LAST_CONNECTOR = 'achilyon-last-connector'

interface WalletStore extends WalletState {
  session: Session | null
  sessionLoaded: boolean
  connectors: ConnectorInfo[]
  modalOpen: boolean
  signingIn: boolean
  dispatch: (a: WalletAction) => void
  refreshConnectors: () => void
  openModal: () => void
  closeModal: () => void
  connect: (connectorId: string) => Promise<boolean>
  disconnect: () => Promise<void>
  loadSession: () => Promise<void>
  /** Ensures a server session exists for the connected wallet (signs in if needed). */
  ensureSession: () => Promise<Session | null>
  reconnect: () => Promise<void>
}

let unsubscribeProvider: (() => void) | null = null

export const useWallet = create<WalletStore>((set, get) => ({
  ...INITIAL_WALLET_STATE,
  session: null,
  sessionLoaded: false,
  connectors: [],
  modalOpen: false,
  signingIn: false,

  dispatch: (a) => set((s) => walletReducer(s, a)),
  refreshConnectors: () => set({ connectors: listConnectors() }),
  openModal: () => set({ modalOpen: true, connectors: listConnectors() }),
  closeModal: () => set({ modalOpen: false }),

  connect: async (connectorId) => {
    const connector = getConnector(connectorId)
    if (!connector) {
      set((s) => walletReducer(s, { type: 'CONNECT_ERROR', error: 'This wallet is not available in your browser' }))
      return false
    }
    get().dispatch({ type: 'CONNECT_START', connectorId })
    try {
      const { address, evmChainId } = await connector.connect()
      const isDemo = connector.info.kind === 'mock'
      get().dispatch({ type: 'CONNECT_SUCCESS', address, evmChainId, isDemo })
      localStorage.setItem(LAST_CONNECTOR, connectorId)
      unsubscribeProvider?.()
      unsubscribeProvider = connector.subscribe?.({
        onAccounts: (accounts) => {
          get().dispatch({ type: 'ACCOUNT_CHANGED', address: accounts[0] ?? null })
          // A different account must sign in again.
          const session = get().session
          if (session && session.address.toLowerCase() !== (accounts[0] ?? '').toLowerCase()) {
            void api.post('/api/auth/logout').catch(() => undefined)
            set({ session: null })
          }
        },
        onChain: (id) => get().dispatch({ type: 'CHAIN_CHANGED', evmChainId: id }),
      }) ?? null
      set({ modalOpen: false })
      if (isDemo) await get().ensureSession()
      return true
    } catch (e) {
      get().dispatch({ type: 'CONNECT_ERROR', error: errorMessage(e) })
      return false
    }
  },

  disconnect: async () => {
    const id = get().connectorId
    unsubscribeProvider?.()
    unsubscribeProvider = null
    if (id) await getConnector(id)?.disconnect().catch(() => undefined)
    localStorage.removeItem(LAST_CONNECTOR)
    await api.post('/api/auth/logout').catch(() => undefined)
    set({ ...INITIAL_WALLET_STATE, session: null })
  },

  loadSession: async () => {
    try {
      const session = await api.get<Session | null>('/api/auth/session')
      set({ session, sessionLoaded: true })
    } catch {
      set({ sessionLoaded: true })
    }
  },

  ensureSession: async () => {
    const { session, address, connectorId, isDemo, status } = get()
    if (status !== 'connected' || !address || !connectorId) return null
    if (session && session.address.toLowerCase() === address.toLowerCase()) return session
    set({ signingIn: true })
    try {
      let next: Session
      if (isDemo) {
        next = await api.post<Session>('/api/auth/demo')
      } else {
        const connector = getConnector(connectorId)
        if (!connector) throw new Error('Wallet disconnected')
        const { nonce } = await api.get<{ nonce: string }>('/api/auth/nonce')
        const message = signInMessage({
          domain: window.location.host,
          address,
          uri: window.location.origin,
          chainId: get().evmChainId ?? 1,
          nonce,
          issuedAt: new Date().toISOString(),
        })
        const signature = await connector.signMessage(address, message)
        next = await api.post<Session>('/api/auth/verify', { address, message, signature })
      }
      set({ session: next })
      return next
    } finally {
      set({ signingIn: false })
    }
  },

  reconnect: async () => {
    const last = typeof localStorage !== 'undefined' ? localStorage.getItem(LAST_CONNECTOR) : null
    if (!last) return
    const connector = getConnector(last)
    if (!connector) return
    if (connector.info.kind === 'mock') {
      await get().connect(last)
      return
    }
    // Only reconnect silently if the wallet already authorized this site.
    const provider = getProvider(last)
    const authorized = provider ? await getAuthorizedAccount(provider) : null
    if (authorized) await get().connect(last)
  },
}))
