import { ok } from '@/lib/api/http'
import { publicConfig } from '@/lib/config'
import { getMarketProvider } from '@/lib/blockchain/providers'

/** GET /api/health — liveness + active data mode. */
export async function GET() {
  const provider = getMarketProvider()
  return ok({ status: 'ok', demoMode: publicConfig.demoMode, provider: provider.id, source: provider.source, time: Date.now() })
}
