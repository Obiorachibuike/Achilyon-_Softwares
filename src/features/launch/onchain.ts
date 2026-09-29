import type { LaunchParams } from '@/lib/contracts/launchpad'
import { encodeMetadata } from '@/lib/contracts/metadata'
import { applySlippage } from '@/lib/contracts/tradeQuote'
import { parseUnitsSafe } from '@/lib/contracts/curveMath'
import type { LaunchDraft } from './draft'

const enc = new TextEncoder()

/** Draft problems the contract would reject (byte lengths differ from character counts). */
export function onchainDraftProblem(d: LaunchDraft): string | null {
  if (enc.encode(d.name.trim()).length > 32) return 'The name is longer than 32 bytes once encoded — shorten it or remove emoji.'
  if (enc.encode(d.symbol).length > 10) return 'The ticker is longer than 10 bytes.'
  if (!Number.isInteger(d.totalSupply) || d.totalSupply < 1_000_000 || d.totalSupply > 1_000_000_000_000) return 'Total supply must be a whole number between 1M and 1T.'
  if (d.initialBuyQuote > 0 && parseUnitsSafe(String(d.initialBuyQuote)) === null) return 'The initial buy amount is not valid.'
  return null
}

/** Contract parameters for a draft (logo images are not stored on-chain). */
export function toLaunchParams(d: LaunchDraft): Omit<LaunchParams, 'minTokensOut' | 'deadline'> {
  const metadataURI = encodeMetadata({
    description: d.description.trim(),
    website: d.website || undefined, twitter: d.twitter || undefined, telegram: d.telegram || undefined, discord: d.discord || undefined,
  })
  return {
    name: d.name.trim(),
    symbol: d.symbol,
    metadataURI,
    totalSupply: BigInt(d.totalSupply) * 10n ** 18n,
    curveBps: Math.round(d.curveAllocationPct * 100),
    creatorBps: Math.round(d.creatorAllocationPct * 100),
    initialBuy: d.initialBuyQuote > 0 ? parseUnitsSafe(String(d.initialBuyQuote)) ?? 0n : 0n,
  }
}

export const minInitialTokens = (expected: bigint, slippageBps: number) => applySlippage(expected, slippageBps)
