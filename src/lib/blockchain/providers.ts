import 'server-only'
import { publicConfig } from '@/lib/config'
import { onchainLaunchesEnabled } from '@/lib/contracts/deployments'
import { demoProvider } from '@/services/providers/demoProvider'
import { liveProvider } from '@/services/providers/liveProvider'
import { withLaunchpad } from '@/services/providers/launchpadProvider'
import type { MarketDataProvider } from '@/services/providers/types'

const withDemo = withLaunchpad(demoProvider)
const withLive = withLaunchpad(liveProvider)

/**
 * Selects the active market data provider from NEXT_PUBLIC_DEMO_MODE. When a
 * launchpad deployment is configured, on-chain launches are merged in.
 */
export function getMarketProvider(): MarketDataProvider {
  const base = publicConfig.demoMode ? demoProvider : liveProvider
  if (!onchainLaunchesEnabled()) return base
  return publicConfig.demoMode ? withDemo : withLive
}
