import 'server-only'
import { createPublicClient, http, formatUnits, isAddress, type Chain } from 'viem'
import { arbitrum, avalanche, base, bsc, mainnet, polygon } from 'viem/chains'
import type { ChainId, Portfolio } from '@/types'
import { NETWORKS } from './chains'
import { serverEnv } from '@/lib/env.server'
import { getEngine } from '@/services/demo/engine'

/**
 * Server-side wallet reads. RPC URLs stay on the server (RPC_URL_*); the
 * browser only talks to /api routes. Without a configured RPC URL, viem's
 * public default endpoint for the chain is used (rate limited).
 */

export const VIEM_CHAINS: Partial<Record<ChainId, Chain>> = { ethereum: mainnet, base, arbitrum, polygon, bsc, avalanche }

export function rpcUrl(chain: ChainId): string | undefined {
  const env = serverEnv()
  const map: Partial<Record<ChainId, string | undefined>> = {
    ethereum: env.RPC_URL_ETHEREUM, base: env.RPC_URL_BASE, arbitrum: env.RPC_URL_ARBITRUM,
    polygon: env.RPC_URL_POLYGON, bsc: env.RPC_URL_BSC, avalanche: env.RPC_URL_AVALANCHE,
  }
  return map[chain]
}

export async function getNativeBalance(chain: ChainId, address: string): Promise<{ amount: number; symbol: string } | null> {
  const viemChain = VIEM_CHAINS[chain]
  if (!viemChain || !isAddress(address)) return null
  const client = createPublicClient({ chain: viemChain, transport: http(rpcUrl(chain), { timeout: 8_000 }) })
  const wei = await client.getBalance({ address })
  return { amount: Number(formatUnits(wei, NETWORKS[chain].nativeDecimals)), symbol: NETWORKS[chain].nativeSymbol }
}

/** Portfolio for a wallet: simulated for the demo wallet, native balance only for real wallets. */
export async function getPortfolio(address: string, demo: boolean, chain: ChainId): Promise<Portfolio> {
  if (demo) return getEngine().portfolio(address)
  const notes = ['Token balances and P&L require an indexer, which is not configured yet. Only the native balance is shown.']
  let native: { amount: number; symbol: string } | null = null
  try {
    native = await getNativeBalance(chain, address)
  } catch {
    notes.push('The RPC endpoint did not respond — balance unavailable.')
  }
  return {
    address,
    source: 'live',
    cashUsd: 0,
    holdings: native
      ? [{ chain, tokenAddress: 'native', symbol: native.symbol, name: `${NETWORKS[chain].name} native`, logoUrl: null, amount: native.amount, avgCostUsd: 0, priceUsd: 0, valueUsd: 0, change24h: 0, pnlUsd: 0, pnlPct: 0 }]
      : [],
    totalValueUsd: 0,
    change24hUsd: 0,
    change24hPct: 0,
    realizedPnlUsd: 0,
    unrealizedPnlUsd: 0,
    history: [],
    notes: [...notes, 'USD valuation of native balances requires a price feed and is not shown.'],
  }
}
