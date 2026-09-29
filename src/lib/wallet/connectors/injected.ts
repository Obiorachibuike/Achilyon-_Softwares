'use client'
import type { ConnectorInfo, WalletConnector } from '../types'
import { WalletError } from '../types'
import { toWalletError } from '../errors'

/** Minimal EIP-1193 provider surface we rely on. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>
  on?(event: string, listener: (...args: unknown[]) => void): void
  removeListener?(event: string, listener: (...args: unknown[]) => void): void
}

export interface Eip6963Detail {
  info: { uuid: string; name: string; icon: string; rdns: string }
  provider: Eip1193Provider
}

const asAccounts = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
const asChainId = (v: unknown): number | null => (typeof v === 'string' ? parseInt(v, 16) : typeof v === 'number' ? v : null)

/**
 * Connector for any injected EIP-1193 wallet (MetaMask, Coinbase Wallet
 * extension, Rabby, Brave, …). Requests only `eth_requestAccounts`,
 * `personal_sign` and `wallet_switchEthereumChain`.
 */
export function createInjectedConnector(provider: Eip1193Provider, info: Omit<ConnectorInfo, 'kind' | 'available'>): WalletConnector {
  return {
    info: { ...info, kind: 'injected', available: true },
    async connect() {
      try {
        const accounts = asAccounts(await provider.request({ method: 'eth_requestAccounts' }))
        const first = accounts[0]
        if (!first) throw new WalletError('No account was shared by the wallet', 'USER_REJECTED')
        const chainId = asChainId(await provider.request({ method: 'eth_chainId' }))
        return { address: first, evmChainId: chainId }
      } catch (e) {
        throw toWalletError(e)
      }
    },
    async disconnect() {
      // EIP-1193 has no disconnect; try the permission-revocation extension where supported.
      try {
        await provider.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] })
      } catch {
        /* not supported — the site simply forgets the connection */
      }
    },
    async signMessage(address, message) {
      try {
        const sig = await provider.request({ method: 'personal_sign', params: [message, address] })
        if (typeof sig !== 'string') throw new WalletError('Wallet returned an invalid signature', 'UNKNOWN')
        return sig
      } catch (e) {
        throw toWalletError(e)
      }
    },
    async switchChain(evmChainId) {
      try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${evmChainId.toString(16)}` }] })
      } catch (e) {
        throw toWalletError(e)
      }
    },
    subscribe({ onAccounts, onChain }) {
      const acc = (a: unknown) => onAccounts(asAccounts(a))
      const chain = (c: unknown) => {
        const id = asChainId(c)
        if (id !== null) onChain(id)
      }
      provider.on?.('accountsChanged', acc)
      provider.on?.('chainChanged', chain)
      return () => {
        provider.removeListener?.('accountsChanged', acc)
        provider.removeListener?.('chainChanged', chain)
      }
    },
  }
}

/** Silent reconnect: returns the already-authorized account without prompting. */
export async function getAuthorizedAccount(provider: Eip1193Provider): Promise<{ address: string; evmChainId: number | null } | null> {
  try {
    const accounts = asAccounts(await provider.request({ method: 'eth_accounts' }))
    if (!accounts[0]) return null
    return { address: accounts[0], evmChainId: asChainId(await provider.request({ method: 'eth_chainId' })) }
  } catch {
    return null
  }
}

/** EIP-6963 multi-wallet discovery. */
export function discoverInjected(onAnnounce: (d: Eip6963Detail) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<Eip6963Detail>).detail
    if (detail?.info?.uuid && detail.provider) onAnnounce(detail)
  }
  window.addEventListener('eip6963:announceProvider', handler)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  return () => window.removeEventListener('eip6963:announceProvider', handler)
}

export function legacyInjected(): Eip1193Provider | null {
  if (typeof window === 'undefined') return null
  const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum
  return eth && typeof eth.request === 'function' ? eth : null
}
