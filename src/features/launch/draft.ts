import type { ChainId } from '@/types'
import { NETWORKS } from '@/lib/blockchain/chains'
import { launchSettingsSchema, tokenEconomicsSchema, tokenInfoSchema } from '@/lib/api/schemas'

/** Launch wizard draft state + per-step validation (pure, testable). */

export interface LaunchDraft {
  name: string
  symbol: string
  description: string
  logoDataUrl: string | null
  website: string
  twitter: string
  telegram: string
  discord: string
  totalSupply: number
  curveAllocationPct: number
  creatorAllocationPct: number
  chain: ChainId
  initialBuyQuote: number
  slippageBps: number
}

export const MAX_LOGO_BYTES = 250 * 1024

export function emptyDraft(chain: ChainId): LaunchDraft {
  return {
    name: '', symbol: '', description: '', logoDataUrl: null,
    website: '', twitter: '', telegram: '', discord: '',
    totalSupply: 1_000_000_000, curveAllocationPct: 80, creatorAllocationPct: 0,
    chain, initialBuyQuote: 0, slippageBps: 500,
  }
}

export const liquidityPct = (d: LaunchDraft) => Math.round((100 - d.curveAllocationPct - d.creatorAllocationPct) * 100) / 100
export const decimalsFor = (chain: ChainId) => (NETWORKS[chain].kind === 'solana' ? 6 : 18)

export function toRequest(d: LaunchDraft) {
  return {
    info: {
      name: d.name.trim(), symbol: d.symbol.trim(), description: d.description.trim(),
      logoDataUrl: d.logoDataUrl ?? undefined,
      website: d.website.trim() || undefined, twitter: d.twitter.trim() || undefined, telegram: d.telegram.trim() || undefined, discord: d.discord.trim() || undefined,
    },
    economics: {
      totalSupply: d.totalSupply, decimals: decimalsFor(d.chain),
      creatorAllocationPct: d.creatorAllocationPct, curveAllocationPct: d.curveAllocationPct, liquidityAllocationPct: liquidityPct(d),
    },
    settings: { chain: d.chain, initialBuyQuote: d.initialBuyQuote, slippageBps: d.slippageBps, antiSnipeBlocks: 0, maxWalletPct: 100 },
  }
}

export type FieldErrors = Partial<Record<string, string>>

function collect(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }): FieldErrors {
  if (result.success || !result.error) return {}
  const out: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[issue.path.length - 1] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}

/** Step indices: 0 details, 1 socials, 2 tokenomics, 3 settings, 4 review, 5 deploy. */
export function validateStep(step: number, d: LaunchDraft): FieldErrors {
  const req = toRequest(d)
  switch (step) {
    case 0: return collect(tokenInfoSchema.pick({ name: true, symbol: true, description: true, logoDataUrl: true }).safeParse(req.info))
    case 1: return collect(tokenInfoSchema.pick({ website: true, twitter: true, telegram: true, discord: true }).safeParse(req.info))
    case 2: return collect(tokenEconomicsSchema.safeParse(req.economics))
    case 3: return collect(launchSettingsSchema.safeParse(req.settings))
    default: return {}
  }
}
