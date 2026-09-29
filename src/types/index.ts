/**
 * Shared domain types for Achilyon.
 *
 * These types are the contract between the data providers (demo engine,
 * DexScreener, future indexers), the API layer and the UI. Components never
 * consume raw provider payloads — adapters map everything into these shapes.
 */

export type ChainId = 'ethereum' | 'base' | 'solana' | 'bsc' | 'polygon' | 'arbitrum' | 'avalanche'

export type ChainKind = 'evm' | 'solana'

export interface Network {
  id: ChainId
  name: string
  shortName: string
  kind: ChainKind
  /** EIP-155 chain id for EVM networks. */
  evmChainId?: number
  nativeSymbol: string
  nativeDecimals: number
  explorer: { name: string; baseUrl: string }
  /** Brand accent used for chain chips. */
  color: string
  /** GoPlus security API chain identifier. */
  goplusId?: string
  /** GeckoTerminal network slug (used for live candles and trades). */
  geckoId?: string
  /** Quote asset used by Achilyon bonding curves on this network. */
  curveQuote: { symbol: string; usdReference: number }
}

export interface Dex {
  id: string
  name: string
  chains: ChainId[]
}

/** Where a record came from. Demo data must always be labelled in the UI. */
export type DataSource = 'demo' | 'live'

/** bonding = trading on an Achilyon curve, migrated = curve completed and moved to a DEX, listed = regular DEX token. */
export type TokenStatus = 'bonding' | 'migrated' | 'listed'

export interface TokenSocials {
  website?: string
  twitter?: string
  telegram?: string
  discord?: string
}

export interface Token {
  chain: ChainId
  address: string
  name: string
  symbol: string
  decimals: number
  logoUrl: string | null
  description: string
  socials: TokenSocials
  creator: string | null
  createdAt: number
  totalSupply: number | null
  verified: boolean
  status: TokenStatus
  /** Launched through the Achilyon launchpad. */
  launchpad: boolean
}

export interface PriceChanges {
  m5: number
  h1: number
  h6: number
  h24: number
}

export interface TxCounts {
  buys: number
  sells: number
}

export interface TokenMarketData {
  priceUsd: number
  priceChange: PriceChanges
  volume: { h1: number; h6: number; h24: number }
  liquidityUsd: number
  marketCap: number
  fdv: number
  txns: { h1: TxCounts; h24: TxCounts }
  holders: number | null
  updatedAt: number
}

export interface PairTokenRef {
  address: string
  symbol: string
  name: string
}

export interface TradingPair {
  chain: ChainId
  address: string
  dexId: string
  dexName: string
  baseToken: PairTokenRef
  quoteToken: PairTokenRef
  priceUsd: number
  priceNative: number
  liquidityUsd: number
  volume24h: number
  txns24h: TxCounts
  priceChange24h: number
  createdAt: number
  source: DataSource
}

export interface MarketToken {
  token: Token
  market: TokenMarketData
  pair: TradingPair
  curve: BondingCurveSnapshot | null
  social: { comments: number; watchers: number }
  source: DataSource
}

/** Serializable bonding curve summary attached to launchpad tokens. */
export interface BondingCurveSnapshot {
  kind: 'constant-product' | 'linear'
  quoteSymbol: string
  quoteUsd: number
  totalSupply: number
  curveSupply: number
  tokensSold: number
  quoteRaised: number
  virtualQuoteReserve: number
  virtualTokenReserve: number
  migrationQuoteTarget: number
  progress: number
  migrated: boolean
  feeBps: number
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M'

export interface Candle {
  /** Unix seconds (bucket open). */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type TradeSide = 'buy' | 'sell'

export type ChainTxStatus = 'pending' | 'confirmed' | 'failed'

export interface MarketTrade {
  id: string
  hash: string
  chain: ChainId
  tokenAddress: string
  symbol: string
  side: TradeSide
  amountToken: number
  amountUsd: number
  priceUsd: number
  wallet: string
  timestamp: number
  status: ChainTxStatus
  source: DataSource
}

export type WalletActivityType = 'buy' | 'sell' | 'launch'

export interface WalletTransaction extends Omit<MarketTrade, 'side'> {
  type: WalletActivityType
}

export interface Holding {
  chain: ChainId
  tokenAddress: string
  symbol: string
  name: string
  logoUrl: string | null
  amount: number
  avgCostUsd: number
  priceUsd: number
  valueUsd: number
  change24h: number
  pnlUsd: number
  pnlPct: number
}

export interface Portfolio {
  address: string
  source: DataSource
  cashUsd: number
  holdings: Holding[]
  totalValueUsd: number
  change24hUsd: number
  change24hPct: number
  realizedPnlUsd: number
  unrealizedPnlUsd: number
  history: { time: number; value: number }[]
  /** Explains any gaps (e.g. token balances require an indexer). */
  notes: string[]
}

export type CommentStatus = 'visible' | 'hidden' | 'flagged'

export interface Comment {
  id: string
  tokenKey: string
  parentId: string | null
  author: string
  content: string
  createdAt: number
  likes: number
  likedByMe: boolean
  replyCount: number
  status: CommentStatus
}

export type ReportTarget = 'token' | 'comment' | 'account'
export type ReportStatus = 'open' | 'resolved' | 'dismissed'

export interface Report {
  id: string
  targetType: ReportTarget
  targetId: string
  reason: string
  details: string
  reporter: string
  createdAt: number
  status: ReportStatus
}

export interface AppNotification {
  id: string
  kind: 'price' | 'launch' | 'trade' | 'system' | 'watchlist'
  title: string
  body: string
  href?: string
  createdAt: number
  read: boolean
}

export type Role = 'user' | 'admin'

export interface UserProfile {
  address: string
  joinedAt: number
  reputation: number
  createdTokens: number
  comments: number
  role: Role
}

export interface Session {
  address: string
  role: Role
  demo: boolean
  issuedAt: number
  expiresAt: number
}

export interface SearchResults {
  tokens: MarketToken[]
  pairs: TradingPair[]
  creators: { address: string; tokens: number }[]
}

/** Uniform API envelope used by every route handler. */
export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> }
export type ApiFailure = { ok: false; error: { code: string; message: string; details?: unknown } }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface TokenRef {
  chain: ChainId
  address: string
}

export interface WatchlistEntry extends TokenRef {
  addedAt: number
}
