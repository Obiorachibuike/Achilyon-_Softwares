import 'server-only'
import { tokenRefSchema } from './schemas'
import { ApiError } from './http'
import type { TokenRef } from '@/types'
import { isValidAddress } from '@/lib/blockchain/chains'

export async function tokenParams(params: Promise<{ chain: string; address: string }>): Promise<TokenRef> {
  const raw = await params
  const parsed = tokenRefSchema.safeParse({ chain: raw.chain, address: decodeURIComponent(raw.address) })
  if (!parsed.success || !isValidAddress(parsed.data.chain, parsed.data.address)) throw new ApiError(400, 'INVALID_TOKEN', 'Invalid chain or address')
  return parsed.data
}
