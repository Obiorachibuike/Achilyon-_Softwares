import type { ChainId } from '@/types'

export const tokenPath = (chain: ChainId, address: string) => `/token/${chain}/${address}`
export const profilePath = (address: string) => `/profile/${address}`
export const tokenApi = (chain: ChainId, address: string) => `/api/tokens/${chain}/${encodeURIComponent(address)}`
