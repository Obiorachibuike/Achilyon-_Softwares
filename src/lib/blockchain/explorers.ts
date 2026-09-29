import type { ChainId, DataSource } from '@/types'
import { NETWORKS } from './chains'
import { launchpadFor } from '@/lib/contracts/deployments'

/** A network slot pointed at a testnet deployment links to that testnet's explorer. */
function explorerBase(chain: ChainId): string {
  const d = launchpadFor(chain)
  return d?.testnet ? d.explorerUrl : NETWORKS[chain].explorer.baseUrl
}

/**
 * Chain-aware block explorer links. Demo records never get explorer links —
 * they don't exist on-chain and linking them would be misleading.
 */
export function explorerTxUrl(chain: ChainId, hash: string, source: DataSource = 'live'): string | null {
  if (source === 'demo') return null
  return `${explorerBase(chain)}/tx/${hash}`
}

export function explorerAddressUrl(chain: ChainId, address: string, source: DataSource = 'live'): string | null {
  if (source === 'demo') return null
  const base = explorerBase(chain)
  return NETWORKS[chain].kind === 'solana' ? `${base}/account/${address}` : `${base}/address/${address}`
}

export function explorerTokenUrl(chain: ChainId, address: string, source: DataSource = 'live'): string | null {
  if (source === 'demo') return null
  return `${explorerBase(chain)}/token/${address}`
}

export function explorerName(chain: ChainId): string {
  return NETWORKS[chain].explorer.name
}
