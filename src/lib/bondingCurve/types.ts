/**
 * Bonding curve types.
 *
 * Units: token amounts are whole tokens (not base units) and quote amounts are
 * units of the quote asset (e.g. ETH or SOL). The UI simulation uses IEEE
 * doubles; an on-chain implementation must use integer maths (bigint) with the
 * same formulas.
 */

export type CurveKind = 'constant-product' | 'linear'

export interface CurveConfig {
  kind: CurveKind
  /** Total token supply minted at launch. */
  totalSupply: number
  /** Tokens sold through the curve before migration. The remainder seeds DEX liquidity. */
  curveSupply: number
  /** Constant-product: virtual quote reserve (X₀). */
  virtualQuoteReserve: number
  /** Constant-product: virtual token reserve (Y₀). Must exceed curveSupply. */
  virtualTokenReserve: number
  /** Linear: price of the first token (quote per token). */
  basePrice: number
  /** Linear: price increase per token sold (quote per token²). */
  slope: number
  /** Trading fee in basis points, taken from the quote side. */
  feeBps: number
  quoteSymbol: string
  /** USD value of one quote unit, used for display only. */
  quoteUsd: number
}

export interface CurveState {
  config: CurveConfig
  /** Tokens sold on the curve so far (0 ≤ tokensSold ≤ curveSupply). */
  tokensSold: number
  /** Net quote held by the curve (excludes fees). */
  quoteRaised: number
  migrated: boolean
}

/**
 * A pricing model describes the curve's shape. All trade maths is derived
 * from these three functions so new shapes can be added without touching the
 * trade/quote logic.
 */
export interface PricingModel {
  /** Marginal price (quote per token) after `sold` tokens have been sold. */
  spotPrice(sold: number): number
  /** Quote required to move the curve from `from` to `to` tokens sold (to ≥ from). */
  costBetween(from: number, to: number): number
  /** Tokens received for spending `quote` (after fees) starting at `sold`. */
  tokensForQuote(sold: number, quote: number): number
}

export interface BuyQuote {
  quoteIn: number
  quoteUsed: number
  fee: number
  tokensOut: number
  avgPrice: number
  spotBefore: number
  spotAfter: number
  /** Percentage difference between the average fill and the pre-trade spot price. */
  priceImpactPct: number
  /** True when the order was clipped by the remaining curve supply. */
  capped: boolean
  refund: number
}

export interface SellQuote {
  tokensIn: number
  grossQuote: number
  fee: number
  quoteOut: number
  avgPrice: number
  spotBefore: number
  spotAfter: number
  priceImpactPct: number
}

export interface CurveSummary {
  priceQuote: number
  priceUsd: number
  /** Price after the next 1% of curve supply is bought. */
  nextPriceUsd: number
  marketCapUsd: number
  virtualLiquidityUsd: number
  progress: number
  remainingCurveTokens: number
  migrationQuoteTarget: number
  migrationMarketCapUsd: number
  quoteRaised: number
  migrated: boolean
}
