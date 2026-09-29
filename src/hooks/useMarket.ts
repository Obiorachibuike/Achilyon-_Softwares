'use client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { Candle, ChainId, Comment, MarketToken, MarketTrade, Paginated, Portfolio, SearchResults, Timeframe, TradingPair, WalletTransaction } from '@/types'
import type { MarketList } from '@/lib/api/lists'
import type { SecurityCheck, SecurityScore } from '@/lib/market/security'
import { api, apiRequest } from '@/lib/api/client'
import { tokenApi } from '@/lib/paths'
import { publicConfig } from '@/lib/config'
import { useWallet } from '@/stores/wallet'

/**
 * Server-state hooks (TanStack Query). Caching, deduplication, background
 * refresh and stale-while-revalidate live here — components only render.
 */

const POLL = publicConfig.demoMode ? 15_000 : 30_000

export const queryKeys = {
  list: (list: MarketList, params: string) => ['tokens', list, params] as const,
  token: (chain: ChainId, address: string) => ['token', chain, address.toLowerCase()] as const,
  candles: (chain: ChainId, address: string, tf: Timeframe) => ['candles', chain, address.toLowerCase(), tf] as const,
  trades: (chain: ChainId, address: string) => ['trades', chain, address.toLowerCase()] as const,
  comments: (chain: ChainId, address: string, sort: string) => ['comments', chain, address.toLowerCase(), sort] as const,
  search: (q: string) => ['search', q] as const,
  portfolio: (address: string | null) => ['portfolio', address] as const,
  walletTx: (address: string | null) => ['wallet-tx', address] as const,
  demoBalance: (chain: ChainId, address: string) => ['demo-balance', chain, address.toLowerCase()] as const,
}

export interface TokenListResult extends Paginated<MarketToken> {
  pages: number
  demo: boolean
}

export function useTokenList(list: MarketList, params: URLSearchParams | string = '', opts: { enabled?: boolean; refetch?: boolean } = {}) {
  const qs = typeof params === 'string' ? params : params.toString()
  return useQuery({
    queryKey: queryKeys.list(list, qs),
    queryFn: async (): Promise<TokenListResult> => {
      const { data, meta } = await apiRequest<Paginated<MarketToken>>(`/api/tokens?list=${list}${qs ? `&${qs}` : ''}`)
      return { ...data, pages: Number(meta?.pages ?? 1), demo: Boolean(meta?.demo) }
    },
    placeholderData: keepPreviousData,
    refetchInterval: opts.refetch === false ? false : POLL,
    enabled: opts.enabled ?? true,
  })
}

export function useToken(chain: ChainId, address: string, initial?: { token: MarketToken; pairs: TradingPair[] }) {
  return useQuery({
    queryKey: queryKeys.token(chain, address),
    queryFn: () => api.get<{ token: MarketToken; pairs: TradingPair[] }>(tokenApi(chain, address)),
    initialData: initial,
    refetchInterval: publicConfig.demoMode ? 8_000 : 20_000,
  })
}

export function useCandles(chain: ChainId, address: string, tf: Timeframe) {
  return useQuery({
    queryKey: queryKeys.candles(chain, address, tf),
    queryFn: () => api.get<Candle[]>(`${tokenApi(chain, address)}/candles?tf=${tf}`),
    placeholderData: keepPreviousData,
    refetchInterval: tf === '1m' || tf === '5m' ? 20_000 : 60_000,
  })
}

export function useTrades(chain: ChainId, address: string) {
  return useQuery({
    queryKey: queryKeys.trades(chain, address),
    queryFn: () => api.get<MarketTrade[]>(`${tokenApi(chain, address)}/trades?limit=40`),
    refetchInterval: publicConfig.demoMode ? 6_000 : 20_000,
  })
}

export function useSecurity(chain: ChainId, address: string, enabled = true) {
  return useQuery({
    queryKey: ['security', chain, address.toLowerCase()],
    queryFn: () => api.get<{ available: boolean; reason: string | null; checks: SecurityCheck[]; score: SecurityScore | null }>(`${tokenApi(chain, address)}/security`),
    staleTime: 5 * 60_000,
    enabled,
    retry: 1,
  })
}

export function useComments(chain: ChainId, address: string, sort: 'new' | 'top' | 'old') {
  return useQuery({
    queryKey: queryKeys.comments(chain, address, sort),
    queryFn: () => api.get<Comment[]>(`/api/comments?chain=${chain}&address=${encodeURIComponent(address)}&sort=${sort}`),
    refetchInterval: 30_000,
  })
}

export function useSearch(q: string) {
  const query = q.trim()
  return useQuery({
    queryKey: queryKeys.search(query.toLowerCase()),
    queryFn: () => api.get<SearchResults>(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 1,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  })
}

export function usePortfolio(chain: ChainId) {
  const session = useWallet((s) => s.session)
  return useQuery({
    queryKey: [...queryKeys.portfolio(session?.address ?? null), chain],
    queryFn: () => api.get<Portfolio>(`/api/portfolio?chain=${chain}`),
    enabled: Boolean(session),
    refetchInterval: 15_000,
  })
}

export function useWalletTransactions() {
  const session = useWallet((s) => s.session)
  return useQuery({
    queryKey: queryKeys.walletTx(session?.address ?? null),
    queryFn: async () => {
      const { data, meta } = await apiRequest<WalletTransaction[]>('/api/transactions')
      return { items: data, indexed: Boolean(meta?.indexed) }
    },
    enabled: Boolean(session),
    refetchInterval: 20_000,
  })
}

export function useDemoBalance(chain: ChainId, address: string) {
  const session = useWallet((s) => s.session)
  return useQuery({
    queryKey: [...queryKeys.demoBalance(chain, address), session?.address ?? null],
    queryFn: () => api.get<{ cashUsd: number; tokenAmount: number }>(`/api/trade?chain=${chain}&address=${encodeURIComponent(address)}`),
    enabled: Boolean(session?.demo),
  })
}
