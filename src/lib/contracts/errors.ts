import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem'

/** Friendly messages for AchilyonLaunchpad custom errors. */
const MESSAGES: Record<string, string> = {
  DeadlineExpired: 'The transaction took too long and expired — try again',
  UnknownToken: 'This token was not created by the Achilyon launchpad',
  CurveIsComplete: 'The bonding curve is complete — this token now trades on a DEX',
  CurveNotComplete: 'The bonding curve has not completed yet',
  AlreadyMigrated: 'Liquidity has already migrated',
  PoolLocked: 'This token can’t be sent to its DEX pool until the curve graduates',
  OnlyLaunchpad: 'Only the launchpad can trigger a migration',
  ZeroAmount: 'Amount is too small',
  SlippageExceeded: 'Price moved beyond your slippage tolerance — try again or raise slippage',
  ExceedsCurveSold: 'Only tokens bought from the curve can be sold back to it',
  InvalidName: 'Token name must be 1–32 bytes',
  InvalidSymbol: 'Ticker must be 1–10 bytes',
  InvalidMetadata: 'Token metadata is too large',
  InvalidSupply: 'Total supply is outside the allowed range',
  InvalidAllocation: 'Allocation percentages are outside the allowed range',
  EnforcedPause: 'Launches and buys are temporarily paused on this network. Selling is still available.',
  NativeTransferFailed: 'The payout could not be delivered to your address',
  ERC20InsufficientBalance: 'Insufficient token balance',
  ERC20InsufficientAllowance: 'Token approval is missing or too low',
}

export class WrongNetworkError extends Error {
  constructor(readonly expected: number) {
    super(`Switch your wallet to the correct network (chain id ${expected}) to continue`)
    this.name = 'WrongNetworkError'
  }
}

export class SlippageError extends Error {
  constructor() {
    super(MESSAGES.SlippageExceeded)
    this.name = 'SlippageError'
  }
}

export class TxRevertedError extends Error {
  constructor(readonly hash: `0x${string}`) {
    super('The transaction was mined but reverted — no funds were exchanged except gas')
    this.name = 'TxRevertedError'
  }
}

export function isUserRejection(e: unknown): boolean {
  if (e instanceof BaseError && e.walk((x) => x instanceof UserRejectedRequestError)) return true
  const code = (e as { code?: unknown } | null)?.code
  if (code === 4001 || code === 'ACTION_REJECTED') return true
  const cause = (e as { cause?: { code?: unknown } } | null)?.cause
  return cause?.code === 4001
}

/** Maps wallet / RPC / contract errors to a short user-facing message. */
export function contractErrorMessage(e: unknown): string {
  if (isUserRejection(e)) return 'Request was rejected in the wallet'
  if (e instanceof WrongNetworkError || e instanceof TxRevertedError || e instanceof SlippageError) return e.message
  if (e instanceof BaseError) {
    const revert = e.walk((x) => x instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName
      if (name && MESSAGES[name]) return MESSAGES[name]
      if (revert.reason) return revert.reason
    }
    if (/insufficient funds/i.test(e.message)) return 'Insufficient balance to cover the amount plus network fees'
    return e.shortMessage || e.message
  }
  return e instanceof Error ? e.message : 'Transaction failed'
}
