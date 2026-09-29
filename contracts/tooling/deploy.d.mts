import type { Address, Hash, Transport } from 'viem'
import type { PrivateKeyAccount } from 'viem/accounts'

export declare const CHAINS: Record<string, { id: number; explorer: string; usdReference: number }>
export declare class DeployConfigError extends Error {}
export interface DeployConfig {
  chain: string
  account: PrivateKeyAccount
  owner: Address
  feeRecipient: Address
  feeBps: number
  startMarketCapQuote: bigint
  evmChainId: number
  testnet: boolean
  rpcUrl: string | undefined
  explorerUrl: string | undefined
  dexRouter: Address | undefined
  dexFactory: Address | undefined
  wrappedNative: Address | undefined
  pairInitCodeHash: `0x${string}`
  dexName: string
  dryRun: boolean
  yes: boolean
}
export interface DeploymentEntry { address: Address; evmChainId: number; startBlock: number; testnet: boolean; dexName: string; explorerUrl?: string }
export declare const UNISWAP_V2_INIT_CODE_HASH: `0x${string}`
export declare function parseConfig(env: Record<string, string | undefined>, argv?: string[]): DeployConfig
export declare function loadArtifact(name?: string): { abi: unknown[]; bytecode: `0x${string}`; compiler: string }
export declare function deployLaunchpad(config: DeployConfig, transport: Transport, log?: (m: string) => void): Promise<{ hash: Hash; migratorHash: Hash; migrator: Address; entry: DeploymentEntry } | null>
