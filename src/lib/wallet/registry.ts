'use client'
import type { ConnectorInfo, WalletConnector } from './types'
import { createInjectedConnector, discoverInjected, legacyInjected, type Eip1193Provider } from './connectors/injected'
import { createMockConnector } from './connectors/mock'
import { publicConfig } from '@/lib/config'

/**
 * Connector registry. Discovers EIP-6963 wallets, falls back to
 * `window.ethereum`, and adds the demo wallet in demo mode. WalletConnect is
 * listed but disabled until a project id is configured and its SDK added.
 */
const connectors = new Map<string, WalletConnector>()
const providers = new Map<string, Eip1193Provider>()
let started = false
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach((l) => l())
}

export function startDiscovery() {
  if (started || typeof window === 'undefined') return
  started = true
  if (publicConfig.demoMode) connectors.set('demo', createMockConnector())
  discoverInjected(({ info, provider }) => {
    if (connectors.has(info.rdns)) return
    providers.set(info.rdns, provider)
    connectors.set(info.rdns, createInjectedConnector(provider, { id: info.rdns, name: info.name, icon: info.icon }))
    notify()
  })
  // Give EIP-6963 wallets a moment to announce, then fall back to window.ethereum.
  setTimeout(() => {
    const hasInjected = [...connectors.values()].some((c) => c.info.kind === 'injected')
    const legacy = legacyInjected()
    if (!hasInjected && legacy) {
      providers.set('injected', legacy)
      connectors.set('injected', createInjectedConnector(legacy, { id: 'injected', name: 'Browser Wallet' }))
    }
    notify()
  }, 400)
  notify()
}

export function subscribeConnectors(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getConnector(id: string): WalletConnector | undefined {
  return connectors.get(id)
}

export function getProvider(id: string): Eip1193Provider | undefined {
  return providers.get(id)
}

const PLACEHOLDERS: ConnectorInfo[] = [
  { id: 'io.metamask', name: 'MetaMask', kind: 'injected', available: false, unavailableReason: 'Not detected — install the MetaMask extension' },
  { id: 'com.coinbase.wallet', name: 'Coinbase Wallet', kind: 'injected', available: false, unavailableReason: 'Not detected — install the Coinbase Wallet extension' },
  { id: 'walletconnect', name: 'WalletConnect', kind: 'walletconnect', available: false, unavailableReason: 'Coming soon — requires a WalletConnect project id' },
]

export function listConnectors(): ConnectorInfo[] {
  const live = [...connectors.values()].map((c) => c.info)
  const names = new Set(live.map((c) => c.name.toLowerCase()))
  const ids = new Set(live.map((c) => c.id))
  return [...live, ...PLACEHOLDERS.filter((p) => !ids.has(p.id) && !names.has(p.name.toLowerCase()))]
}
