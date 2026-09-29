import type { ChainId, Dex } from '@/types'

/** Known DEX registry. Unknown DEX ids from live providers fall back to a title-cased id. */
export const DEXES: Dex[] = [
  { id: 'achilyon', name: 'Achilyon Curve', chains: ['ethereum', 'base', 'solana', 'bsc', 'polygon', 'arbitrum', 'avalanche'] },
  { id: 'uniswap', name: 'Uniswap', chains: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'avalanche'] },
  { id: 'aerodrome', name: 'Aerodrome', chains: ['base'] },
  { id: 'raydium', name: 'Raydium', chains: ['solana'] },
  { id: 'orca', name: 'Orca', chains: ['solana'] },
  { id: 'meteora', name: 'Meteora', chains: ['solana'] },
  { id: 'pancakeswap', name: 'PancakeSwap', chains: ['bsc', 'ethereum', 'base', 'arbitrum'] },
  { id: 'quickswap', name: 'QuickSwap', chains: ['polygon'] },
  { id: 'camelot', name: 'Camelot', chains: ['arbitrum'] },
  { id: 'traderjoe', name: 'Trader Joe', chains: ['avalanche', 'arbitrum'] },
  { id: 'sushiswap', name: 'SushiSwap', chains: ['ethereum', 'arbitrum', 'polygon'] },
]

export function dexName(id: string): string {
  return DEXES.find((d) => d.id === id)?.name ?? id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function dexesForChain(chain: ChainId): Dex[] {
  return DEXES.filter((d) => d.chains.includes(chain))
}
