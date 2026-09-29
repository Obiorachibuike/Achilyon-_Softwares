import type { ChainId } from '@/types'
import { isChainId } from '@/lib/blockchain/chains'

/**
 * Public (browser-safe) configuration. Only NEXT_PUBLIC_* variables are read
 * here; they are inlined at build time. Never put secrets in NEXT_PUBLIC_*.
 *
 * Achilyon is live-data first. Demo mode is an explicit opt-in for local
 * development and QA; production deployments must not silently present
 * simulated markets as real market activity.
 */

const defaultChain = process.env.NEXT_PUBLIC_DEFAULT_CHAIN

export const publicConfig = {
  appName: 'Achilyon',
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  /** Demo mode is OFF by default; opt in with NEXT_PUBLIC_DEMO_MODE=true. */
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  defaultChain: (defaultChain && isChainId(defaultChain) ? defaultChain : 'base') as ChainId,
  demoStartingBalanceUsd: Number(process.env.NEXT_PUBLIC_DEMO_STARTING_BALANCE) > 0 ? Number(process.env.NEXT_PUBLIC_DEMO_STARTING_BALANCE) : 10_000,
} as const

/** Fixed, publicly known address used by the demo wallet. It holds no real funds and has no private key. */
export const DEMO_WALLET_ADDRESS = '0xDe30A0C8e4b1F2A7c9d4E5b6A7c8D9e0F1a2B3c4'
