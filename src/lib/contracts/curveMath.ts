import type { BondingCurveSnapshot } from '@/types'

/**
 * Exact integer port of AchilyonLaunchpad's curve maths (same formulas, same
 * rounding). Used for client-side estimates, optimistic UI and differential
 * tests against the contract. All amounts are base units (wei / 1e-18 token).
 */

export const BPS = 10_000n
export const VIRTUAL_TOKEN_EXTRA_BPS = 2_800n

export interface OnchainCurve {
  creator: `0x${string}`
  feeBps: number
  complete: boolean
  migrated: boolean
  virtualTokenReserve: bigint
  virtualQuoteReserve: bigint
  realTokenReserve: bigint
  realQuoteReserve: bigint
  curveSupply: bigint
  liquidityTokens: bigint
}

export class CurveMathError extends Error {
  constructor(message: string, readonly code: 'CURVE_COMPLETE' | 'EXCEEDS_CURVE_SOLD' | 'ZERO_AMOUNT') {
    super(message)
    this.name = 'CurveMathError'
  }
}

const mulDivCeil = (a: bigint, b: bigint, d: bigint) => (a * b + d - 1n) / d

export function initialCurve(p: { creator: `0x${string}`; totalSupply: bigint; curveBps: number; creatorBps: number; startMarketCapQuote: bigint; feeBps: number }): OnchainCurve {
  const curveSupply = (p.totalSupply * BigInt(p.curveBps)) / BPS
  const creatorAmount = (p.totalSupply * BigInt(p.creatorBps)) / BPS
  const extra = BigInt(p.curveBps) + VIRTUAL_TOKEN_EXTRA_BPS
  return {
    creator: p.creator,
    feeBps: p.feeBps,
    complete: false,
    migrated: false,
    virtualTokenReserve: (p.totalSupply * extra) / BPS,
    virtualQuoteReserve: (p.startMarketCapQuote * extra) / BPS,
    realTokenReserve: curveSupply,
    realQuoteReserve: 0n,
    curveSupply,
    liquidityTokens: p.totalSupply - curveSupply - creatorAmount,
  }
}

export interface ExactBuyQuote { tokensOut: bigint; net: bigint; fee: bigint; refund: bigint; capped: boolean }
export interface ExactSellQuote { quoteOut: bigint; gross: bigint; fee: bigint }

export function quoteBuyExact(c: OnchainCurve, quoteIn: bigint): ExactBuyQuote {
  if (c.complete) throw new CurveMathError('Bonding curve is complete', 'CURVE_COMPLETE')
  if (quoteIn <= 0n) return { tokensOut: 0n, net: 0n, fee: 0n, refund: 0n, capped: false }
  const vT = c.virtualTokenReserve
  const vQ = c.virtualQuoteReserve
  const f = BigInt(c.feeBps)
  let fee = (quoteIn * f) / BPS
  let net = quoteIn - fee
  let tokensOut = vT - mulDivCeil(vT, vQ, vQ + net)
  let refund = 0n
  let capped = false
  if (tokensOut >= c.realTokenReserve) {
    tokensOut = c.realTokenReserve
    net = mulDivCeil(vT, vQ, vT - tokensOut) - vQ
    fee = mulDivCeil(net, f, BPS - f)
    if (net + fee > quoteIn) fee = quoteIn - net
    refund = quoteIn - net - fee
    capped = true
  }
  return { tokensOut, net, fee, refund, capped }
}

export function quoteSellExact(c: OnchainCurve, tokenAmount: bigint): ExactSellQuote {
  if (c.complete) throw new CurveMathError('Bonding curve is complete', 'CURVE_COMPLETE')
  if (tokenAmount <= 0n) return { quoteOut: 0n, gross: 0n, fee: 0n }
  if (tokenAmount > c.curveSupply - c.realTokenReserve) throw new CurveMathError('Only tokens bought from the curve can be sold back to it', 'EXCEEDS_CURVE_SOLD')
  const vT = c.virtualTokenReserve
  const vQ = c.virtualQuoteReserve
  let gross = vQ - mulDivCeil(vT, vQ, vT + tokenAmount)
  if (gross > c.realQuoteReserve) gross = c.realQuoteReserve
  const fee = (gross * BigInt(c.feeBps)) / BPS
  return { quoteOut: gross - fee, gross, fee }
}

export function applyBuyExact(c: OnchainCurve, quoteIn: bigint): { curve: OnchainCurve; quote: ExactBuyQuote } {
  const quote = quoteBuyExact(c, quoteIn)
  if (quote.tokensOut === 0n) throw new CurveMathError('Buy amount too small', 'ZERO_AMOUNT')
  const realTokenReserve = c.realTokenReserve - quote.tokensOut
  return {
    quote,
    curve: {
      ...c,
      virtualTokenReserve: c.virtualTokenReserve - quote.tokensOut,
      virtualQuoteReserve: c.virtualQuoteReserve + quote.net,
      realTokenReserve,
      realQuoteReserve: c.realQuoteReserve + quote.net,
      complete: realTokenReserve === 0n,
    },
  }
}

export function applySellExact(c: OnchainCurve, tokenAmount: bigint): { curve: OnchainCurve; quote: ExactSellQuote } {
  const quote = quoteSellExact(c, tokenAmount)
  return {
    quote,
    curve: {
      ...c,
      virtualTokenReserve: c.virtualTokenReserve + tokenAmount,
      virtualQuoteReserve: c.virtualQuoteReserve - quote.gross,
      realTokenReserve: c.realTokenReserve + tokenAmount,
      realQuoteReserve: c.realQuoteReserve - quote.gross,
    },
  }
}

/** Largest safe integer-precision conversion of base units to a JS number. */
export function toUnits(value: bigint, decimals = 18): number {
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const frac = value % base
  return Number(whole) + Number(frac) / Number(base)
}

/** Converts decimal user input ("0.25") to base units without float error. */
export function parseUnitsSafe(input: string, decimals = 18): bigint | null {
  const s = input.trim()
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return null
  const [whole = '0', frac = ''] = s.split('.')
  if (frac.length > decimals) return null
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0')
}

/**
 * Converts on-chain curve state into the app's display snapshot. Initial
 * virtual reserves are recovered from the current ones (they move in lockstep
 * with tokens sold / quote raised).
 */
export function curveSnapshot(c: OnchainCurve, totalSupply: bigint, quoteSymbol: string, quoteUsd: number): BondingCurveSnapshot {
  const sold = c.curveSupply - c.realTokenReserve
  const vT0 = c.virtualTokenReserve + sold
  // Migration zeroes realQuoteReserve, so recover the start from k = vQ·vT
  // (fees are outside the reserves; rounding in the curve's favour only
  // makes k drift up by wei).
  const vQ0 = c.migrated ? (c.virtualQuoteReserve * c.virtualTokenReserve) / vT0 : c.virtualQuoteReserve - c.realQuoteReserve
  const raised = c.migrated ? c.virtualQuoteReserve - vQ0 : c.realQuoteReserve
  // Quote needed to buy the whole curve from zero: vQ0·vT0/(vT0 − curveSupply) − vQ0
  const target = mulDivCeil(vQ0, vT0, vT0 - c.curveSupply) - vQ0
  return {
    kind: 'constant-product',
    quoteSymbol,
    quoteUsd,
    totalSupply: toUnits(totalSupply),
    curveSupply: toUnits(c.curveSupply),
    tokensSold: toUnits(sold),
    quoteRaised: toUnits(raised),
    virtualQuoteReserve: toUnits(vQ0),
    virtualTokenReserve: toUnits(vT0),
    migrationQuoteTarget: toUnits(target),
    progress: c.curveSupply > 0n ? Number((sold * 1_000_000n) / c.curveSupply) / 1_000_000 : 0,
    migrated: c.complete,
    feeBps: c.feeBps,
  }
}

/** Marginal price in quote units per whole token. */
export function spotPriceQuote(c: OnchainCurve): number {
  return toUnits((c.virtualQuoteReserve * 10n ** 18n) / c.virtualTokenReserve)
}
