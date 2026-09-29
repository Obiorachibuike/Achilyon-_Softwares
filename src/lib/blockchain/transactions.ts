import 'server-only'
import type { MarketToken, MarketTrade, WalletTransaction } from '@/types'
import { getEngine } from '@/services/demo/engine'
import { getMarketProvider } from './providers'
import { onchainLaunchesEnabled } from '@/lib/contracts/deployments'
import { launchpadWalletActivity } from '@/services/providers/launchpadProvider'

export async function getTransactions(token: MarketToken, limit = 50): Promise<MarketTrade[]> {
  return getMarketProvider().getTrades(token, limit)
}

/**
 * Wallet activity. Demo wallets are served from the simulation. For real
 * wallets only Achilyon launchpad trades (read from contract logs) are shown;
 * full history requires an indexer, so `indexed` stays false.
 */
export async function getWalletTransactions(address: string, demo: boolean): Promise<{ items: WalletTransaction[]; indexed: boolean }> {
  if (demo) return { items: getEngine().walletHistory(address), indexed: true }
  if (!onchainLaunchesEnabled()) return { items: [], indexed: false }
  const items = await launchpadWalletActivity(address).catch(() => [])
  return { items, indexed: false }
}
