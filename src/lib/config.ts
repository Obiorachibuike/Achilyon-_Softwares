import type { ChainId } from '@/types'
import { isChainId } from '@/lib/blockchain/chains'

/**
 * Public (browser-safe) configuration. Only NEXT_PUBLIC_* variables are read
 * here; they are inlined at build time. Never put secrets in NEXT_PUBLIC_*.
 */

const defaultChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN

export const publicConfig = {
  appName: 'Achilyon',
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  /** Demo mode is ON unless explicitly disabled. */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== 'false',
  defaultChain: (defaultChain && isChainId(defaultChain) ? defaultChain : 'base') as ChainId,
  demoStartingBalanceUsd: Number(process.env.NEXT_PUBLIC_DEMO_STARTING_BALANCE) > 0 ? Number(process.env.NEXT_PUBLIC_DEMO_STARTING_BALANCE) : 10_000,
} as const

/** Fixed, publicly known address used by the demo wallet. It holds no real funds and has no private key. */
export const DEMO_WALLET_ADDRESS = '0xDe30A0C8e4b1F2A7c9d4E5b6A7c8D9e0F1a2B3c4'
