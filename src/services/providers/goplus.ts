import 'server-only'
import type { ChainId } from '@/types'
import { NETWORKS } from '@/lib/blockchain/chains'
import { serverEnv } from '@/lib/env.server'
import { cached } from '@/lib/cache.server'
import type { GoPlusRecord } from '@/lib/market/security'
import { ProviderError } from './types'

/** GoPlus token-security adapter (ported from the original analyzer). */
export const goplus = {
  isSupported: (chain: ChainId) => Boolean(NETWORKS[chain].goplusId),

  async tokenSecurity(chain: ChainId, address: string): Promise<GoPlusRecord | null> {
    const id = NETWORKS[chain].goplusId
    if (!id) return null
    const enc = encodeURIComponent(address)
    const path = id === 'solana' ? `/solana/token_security?contract_addresses=${enc}` : `/token_security/${id}?contract_addresses=${enc}`
    return cached(`gp:${chain}:${address.toLowerCase()}`, 5 * 60_000, async () => {
      const res = await fetch(`${serverEnv().GOPLUS_API_BASE}${path}`, { signal: AbortSignal.timeout(12_000) })
      if (!res.ok) throw new ProviderError(`Security API responded ${res.status}`)
      const json: unknown = await res.json()
      if (typeof json !== 'object' || json === null) return null
      const { code, result } = json as { code?: number; result?: Record<string, GoPlusRecord> }
      if (code !== 1 || !result) return null
      return result[address] ?? result[address.toLowerCase()] ?? Object.values(result)[0] ?? null
    })
  },
}
