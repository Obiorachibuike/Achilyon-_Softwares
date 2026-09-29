'use client'
import type { WalletConnector } from '../types'
import { DEMO_WALLET_ADDRESS } from '@/lib/config'

/**
 * Demo wallet. It has no private key and cannot sign anything real: the
 * server authenticates it only while demo mode is enabled, and every trade
 * or launch it makes is settled by the demo engine and labelled simulated.
 */
export function createMockConnector(evmChainId = 8453): WalletConnector {
  let chainId = evmChainId
  return {
    info: { id: 'demo', name: 'Demo Wallet', kind: 'mock', available: true },
    async connect() {
      await new Promise((r) => setTimeout(r, 450))
      return { address: DEMO_WALLET_ADDRESS, evmChainId: chainId }
    },
    async disconnect() {},
    async signMessage() {
      throw new Error('The demo wallet cannot produce signatures')
    },
    async switchChain(id) {
      chainId = id
    },
  }
}
