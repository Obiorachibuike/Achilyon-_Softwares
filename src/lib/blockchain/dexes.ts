import type { ChainId, Dex } from '@/types'

/** Known DEX registry. Unknown DEX ids from live providers fall back to a title-cased id. */
export const DEXES: Dex[] = [
  { id: 'achilyon', name: 'Achilyon Curve', chains: ['ethereum', 'base', 'solana', 'bsc', 'polygon', 'arbitrum', 'avalanche'] },
  { id: 'uniswap', name: 'Uniswap', chains: ['ethereum', 'base', 'arbitrum', 'polygon', 'bsc', 'avalanche'] },
  { id: 'sushiswap', name: 'SushiSwap', chains: ['ethereum', 'arbitrum', 'polygon'] },
  { id: 'curve', name: 'Curve', chains: ['ethereum', 'arbitrum', 'polygon', 'avalanche'] },
  { id: 'aerodrome', name: 'Aerodrome', chains: ['base'] },
  { id: 'baseswap', name: 'BaseSwap', chains: ['base'] },
  { id: 'pancakeswap', name: 'PancakeSwap', chains: ['bsc', 'ethereum', 'base', 'arbitrum'] },
  { id: 'biswap', name: 'Biswap', chains: ['bsc'] },
  { id: 'raydium', name: 'Raydium', chains: ['solana'] },
  { id: 'orca', name: 'Orca', chains: ['solana'] },
  { id: 'jupiter', name: 'Jupiter', chains: ['solana'] },
  { id: 'meteora', name: 'Meteora', chains: ['solana'] },
  { id: 'camelot', name: 'Camelot', chains: ['arbitrum'] },
  { id: 'gmx', name: 'GMX', chains: ['arbitrum', 'avalanche'] },
  { id: 'quickswap', name: 'QuickSwap', chains: ['polygon'] },
  { id: 'traderjoe', name: 'Trader Joe', chains: ['avalanche', 'arbitrum'] },
  { id: 'pangolin', name: 'Pangolin', chains: ['avalanche'] },
]

export function dexName(id: string): string {
  return DEXES.find((d) => d.id === id)?.name ?? id.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function dexesForChain(chain: ChainId): Dex[] {
  return DEXES.filter((d) => d.chains.includes(chain))
}
