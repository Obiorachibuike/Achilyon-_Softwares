import type { BuyQuote, CurveState, SellQuote } from './types'
import { getPricingModel } from './pricing'

const EPS = 1e-9

export class CurveError extends Error {
  constructor(message: string, readonly code: 'INVALID_AMOUNT' | 'CURVE_COMPLETE' | 'INSUFFICIENT_LIQUIDITY' | 'SLIPPAGE') {
    super(message)
    this.name = 'CurveError'
  }
}

function assertAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new CurveError(`${label} must be a positive number`, 'INVALID_AMOUNT')
}

export function remainingCurveTokens(state: CurveState): number {
  return Math.max(0, state.config.curveSupply - state.tokensSold)
}

export function curveProgress(state: CurveState): number {
  return Math.min(1, state.tokensSold / state.config.curveSupply)
}

/** Quote for spending `quoteIn` (fee included) on the curve. */
export function quoteBuy(state: CurveState, quoteIn: number): BuyQuote {
  assertAmount(quoteIn, 'Buy amount')
  if (state.migrated || remainingCurveTokens(state) <= EPS) throw new CurveError('Bonding curve is complete — trade on the DEX pool instead', 'CURVE_COMPLETE')
  const { config } = state
  const model = getPricingModel(config)
  const feeRate = config.feeBps / 10_000
  const spotBefore = model.spotPrice(state.tokensSold)

  let fee = quoteIn * feeRate
  let quoteUsed = quoteIn - fee
  let tokensOut = model.tokensForQuote(state.tokensSold, quoteUsed)
  let capped = false
  const remaining = remainingCurveTokens(state)
  if (tokensOut > remaining) {
    // Clip to the curve end and refund the difference.
    tokensOut = remaining
    quoteUsed = model.costBetween(state.tokensSold, state.tokensSold + remaining)
    fee = quoteUsed * feeRate / (1 - feeRate)
    capped = true
  }
  const avgPrice = tokensOut > 0 ? quoteUsed / tokensOut : spotBefore
  const spotAfter = model.spotPrice(state.tokensSold + tokensOut)
  return {
    quoteIn,
    quoteUsed,
    fee,
    tokensOut,
    avgPrice,
    spotBefore,
    spotAfter,
    priceImpactPct: ((avgPrice - spotBefore) / spotBefore) * 100,
    capped,
    refund: capped ? Math.max(0, quoteIn - quoteUsed - fee) : 0,
  }
}

/** Quote for selling `tokensIn` back to the curve. */
export function quoteSell(state: CurveState, tokensIn: number): SellQuote {
  assertAmount(tokensIn, 'Sell amount')
  if (state.migrated) throw new CurveError('Bonding curve is complete — trade on the DEX pool instead', 'CURVE_COMPLETE')
  if (tokensIn > state.tokensSold + EPS) throw new CurveError('Sell exceeds tokens held by the curve', 'INSUFFICIENT_LIQUIDITY')
  const { config } = state
  const model = getPricingModel(config)
  const spotBefore = model.spotPrice(state.tokensSold)
  const after = Math.max(0, state.tokensSold - tokensIn)
  const grossQuote = Math.min(model.costBetween(after, state.tokensSold), state.quoteRaised)
  const fee = grossQuote * (config.feeBps / 10_000)
  const avgPrice = grossQuote / tokensIn
  return {
    tokensIn,
    grossQuote,
    fee,
    quoteOut: grossQuote - fee,
    avgPrice,
    spotBefore,
    spotAfter: model.spotPrice(after),
    priceImpactPct: ((spotBefore - avgPrice) / spotBefore) * 100,
  }
}

/** Minimum output after slippage tolerance (in bps). */
export function minimumReceived(amountOut: number, slippageBps: number): number {
  return amountOut * (1 - Math.min(Math.max(slippageBps, 0), 10_000) / 10_000)
}

export function applyBuy(state: CurveState, quoteIn: number, minTokensOut = 0): { state: CurveState; quote: BuyQuote } {
  const quote = quoteBuy(state, quoteIn)
  if (quote.tokensOut + EPS < minTokensOut) throw new CurveError('Price moved beyond your slippage tolerance', 'SLIPPAGE')
  const tokensSold = state.tokensSold + quote.tokensOut
  return {
    quote,
    state: {
      ...state,
      tokensSold,
      quoteRaised: state.quoteRaised + quote.quoteUsed,
      migrated: tokensSold >= state.config.curveSupply - EPS,
    },
  }
}

export function applySell(state: CurveState, tokensIn: number, minQuoteOut = 0): { state: CurveState; quote: SellQuote } {
  const quote = quoteSell(state, tokensIn)
  if (quote.quoteOut + EPS < minQuoteOut) throw new CurveError('Price moved beyond your slippage tolerance', 'SLIPPAGE')
  return {
    quote,
    state: {
      ...state,
      tokensSold: Math.max(0, state.tokensSold - tokensIn),
      quoteRaised: Math.max(0, state.quoteRaised - quote.grossQuote),
    },
  }
}
