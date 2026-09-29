import { WalletError } from './types'

interface ProviderRpcError {
  code?: number | string
  message?: string
}

function isRpcError(e: unknown): e is ProviderRpcError {
  return typeof e === 'object' && e !== null && ('code' in e || 'message' in e)
}

/** Normalizes EIP-1193 errors into user-facing WalletErrors. */
export function toWalletError(e: unknown): WalletError {
  if (e instanceof WalletError) return e
  if (isRpcError(e)) {
    if (e.code === 4001 || e.code === 'ACTION_REJECTED') return new WalletError('Request rejected in wallet', 'USER_REJECTED')
    if (e.code === 4902) return new WalletError('This network is not added to your wallet', 'UNSUPPORTED')
    if (e.code === -32002) return new WalletError('A wallet request is already pending — open your wallet', 'UNKNOWN')
    return new WalletError(e.message || 'Wallet request failed', 'UNKNOWN')
  }
  return new WalletError('Wallet request failed', 'UNKNOWN')
}
