import { z } from 'zod'
import type { ChainId } from '@/types'
import { NETWORKS, isChainId } from '@/lib/blockchain/chains'

/**
 * Launchpad deployments, configured per network with one public env var:
 *
 *   NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS='{"base":{"address":"0x…","startBlock":12345678}}'
 *
 * Optional per entry: `evmChainId` + `explorerUrl` + `testnet: true` to point
 * a network slot at a testnet (e.g. Base Sepolia, 84532) for staging.
 * Contract addresses are public — this is not a secret.
 */

const entrySchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid launchpad address'),
  evmChainId: z.number().int().positive().optional(),
  startBlock: z.number().int().nonnegative().default(0),
  explorerUrl: z.string().url().startsWith('https://').optional(),
  testnet: z.boolean().default(false),
  /** DEX that completed curves graduate into (display only). */
  dexName: z.string().trim().min(1).max(32).default('Uniswap V2'),
})

export interface LaunchpadDeployment {
  chain: ChainId
  address: `0x${string}`
  evmChainId: number
  startBlock: bigint
  explorerUrl: string
  testnet: boolean
  nativeSymbol: string
  dexName: string
}

export function parseDeployments(raw: string | undefined): Partial<Record<ChainId, LaunchpadDeployment>> {
  if (!raw?.trim()) return {}
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    console.error('[achilyon] NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS is not valid JSON — on-chain launches disabled')
    return {}
  }
  if (!json || typeof json !== 'object') return {}
  const out: Partial<Record<ChainId, LaunchpadDeployment>> = {}
  for (const [chain, value] of Object.entries(json as Record<string, unknown>)) {
    if (!isChainId(chain) || NETWORKS[chain].kind !== 'evm') {
      console.error(`[achilyon] Launchpad deployment for unsupported network "${chain}" ignored`)
      continue
    }
    const parsed = entrySchema.safeParse(value)
    if (!parsed.success) {
      console.error(`[achilyon] Launchpad deployment for ${chain} ignored: ${parsed.error.issues[0]?.message}`)
      continue
    }
    const net = NETWORKS[chain]
    const evmChainId = parsed.data.evmChainId ?? net.evmChainId
    if (!evmChainId) continue
    out[chain] = {
      chain,
      address: parsed.data.address as `0x${string}`,
      evmChainId,
      startBlock: BigInt(parsed.data.startBlock),
      explorerUrl: (parsed.data.explorerUrl ?? net.explorer.baseUrl).replace(/\/$/, ''),
      testnet: parsed.data.testnet,
      nativeSymbol: net.nativeSymbol,
      dexName: parsed.data.dexName,
    }
  }
  return out
}

// Must be a literal `process.env.NEXT_PUBLIC_…` access so Next inlines it.
const DEPLOYMENTS = parseDeployments(process.env.NEXT_PUBLIC_LAUNCHPAD_DEPLOYMENTS)

export function launchpadFor(chain: ChainId): LaunchpadDeployment | null {
  return DEPLOYMENTS[chain] ?? null
}

export function launchpadDeployments(): LaunchpadDeployment[] {
  return Object.values(DEPLOYMENTS)
}

export const onchainLaunchesEnabled = () => launchpadDeployments().length > 0
