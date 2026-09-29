import type { ChainId, Network } from '@/types'

/**
 * Network registry. Adding a chain = adding an entry here (plus optional
 * RPC/explorer configuration). Everything else reads from this table.
 */
export const NETWORKS: Record<ChainId, Network> = {
  ethereum: {
    id: 'ethereum', name: 'Ethereum', shortName: 'ETH', kind: 'evm', evmChainId: 1, nativeSymbol: 'ETH', nativeDecimals: 18,
    explorer: { name: 'Etherscan', baseUrl: 'https://etherscan.io' }, color: '#8A92B2', goplusId: '1', geckoId: 'eth',
    curveQuote: { symbol: 'ETH', usdReference: 3200 },
  },
  base: {
    id: 'base', name: 'Base', shortName: 'BASE', kind: 'evm', evmChainId: 8453, nativeSymbol: 'ETH', nativeDecimals: 18,
    explorer: { name: 'Basescan', baseUrl: 'https://basescan.org' }, color: '#3B82F6', goplusId: '8453', geckoId: 'base',
    curveQuote: { symbol: 'ETH', usdReference: 3200 },
  },
  solana: {
    id: 'solana', name: 'Solana', shortName: 'SOL', kind: 'solana', nativeSymbol: 'SOL', nativeDecimals: 9,
    explorer: { name: 'Solscan', baseUrl: 'https://solscan.io' }, color: '#9945FF', goplusId: 'solana', geckoId: 'solana',
    curveQuote: { symbol: 'SOL', usdReference: 160 },
  },
  bsc: {
    id: 'bsc', name: 'BNB Chain', shortName: 'BSC', kind: 'evm', evmChainId: 56, nativeSymbol: 'BNB', nativeDecimals: 18,
    explorer: { name: 'BscScan', baseUrl: 'https://bscscan.com' }, color: '#F0B90B', goplusId: '56', geckoId: 'bsc',
    curveQuote: { symbol: 'BNB', usdReference: 590 },
  },
  polygon: {
    id: 'polygon', name: 'Polygon', shortName: 'POL', kind: 'evm', evmChainId: 137, nativeSymbol: 'POL', nativeDecimals: 18,
    explorer: { name: 'Polygonscan', baseUrl: 'https://polygonscan.com' }, color: '#8247E5', goplusId: '137', geckoId: 'polygon_pos',
    curveQuote: { symbol: 'POL', usdReference: 0.45 },
  },
  arbitrum: {
    id: 'arbitrum', name: 'Arbitrum', shortName: 'ARB', kind: 'evm', evmChainId: 42161, nativeSymbol: 'ETH', nativeDecimals: 18,
    explorer: { name: 'Arbiscan', baseUrl: 'https://arbiscan.io' }, color: '#28A0F0', goplusId: '42161', geckoId: 'arbitrum',
    curveQuote: { symbol: 'ETH', usdReference: 3200 },
  },
  avalanche: {
    id: 'avalanche', name: 'Avalanche', shortName: 'AVAX', kind: 'evm', evmChainId: 43114, nativeSymbol: 'AVAX', nativeDecimals: 18,
    explorer: { name: 'Snowtrace', baseUrl: 'https://snowtrace.io' }, color: '#E84142', goplusId: '43114', geckoId: 'avax',
    curveQuote: { symbol: 'AVAX', usdReference: 28 },
  },
}

export const CHAIN_IDS = Object.keys(NETWORKS) as ChainId[]

/** Chains shown in the network selector / filters, in display order. */
export const FILTER_CHAINS: ChainId[] = ['ethereum', 'base', 'solana', 'bsc', 'polygon', 'arbitrum', 'avalanche']

export function isChainId(value: unknown): value is ChainId {
  return typeof value === 'string' && value in NETWORKS
}

export function getNetwork(chain: ChainId): Network {
  return NETWORKS[chain]
}

export function chainName(chain: string): string {
  return isChainId(chain) ? NETWORKS[chain].name : chain
}

export function networkByEvmId(evmChainId: number): Network | undefined {
  return Object.values(NETWORKS).find((n) => n.evmChainId === evmChainId)
}

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const EVM_HASH = /^0x[a-fA-F0-9]{64}$/
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export type AddressKind = 'evm' | 'solana'

export function detectAddressKind(value: string): AddressKind | null {
  const v = value.trim()
  if (EVM_ADDRESS.test(v)) return 'evm'
  if (BASE58.test(v)) return 'solana'
  return null
}

export function isValidAddress(chain: ChainId, value: string): boolean {
  const kind = detectAddressKind(value)
  return kind !== null && kind === NETWORKS[chain].kind
}

export function isTxHash(value: string): boolean {
  return EVM_HASH.test(value) || /^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(value)
}

/** Solana addresses are case-sensitive; EVM addresses are not. */
export function normalizeAddress(chain: ChainId, address: string): string {
  return NETWORKS[chain].kind === 'evm' ? address.toLowerCase() : address
}

export function tokenKey(chain: ChainId, address: string): string {
  return `${chain}:${normalizeAddress(chain, address)}`
}
