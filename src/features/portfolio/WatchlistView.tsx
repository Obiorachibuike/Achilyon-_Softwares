'use client'
import { useQueries } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import type { MarketToken, TradingPair } from '@/types'
import { api } from '@/lib/api/client'
import { tokenApi } from '@/lib/paths'
import { queryKeys } from '@/hooks/useMarket'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useMounted } from '@/hooks/useMounted'
import { useWallet } from '@/stores/wallet'
import { Card, PageHeader } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/feedback'
import { ButtonLink } from '@/components/ui/Button'
import { TokenTable } from '@/features/market/TokenTable'

export function WatchlistView() {
  const mounted = useMounted()
  const { items } = useWatchlist()
  const session = useWallet((s) => s.session)
  const results = useQueries({
    queries: (mounted ? items : []).map((i) => ({
      queryKey: queryKeys.token(i.chain, i.address),
      queryFn: () => api.get<{ token: MarketToken; pairs: TradingPair[] }>(tokenApi(i.chain, i.address)),
      staleTime: 10_000,
      refetchInterval: 30_000,
      retry: 1,
    })),
  })
  const tokens = results.flatMap((r) => (r.data ? [r.data.token] : []))
  const loading = !mounted || results.some((r) => r.isLoading)
  const missing = results.filter((r) => r.isError).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Watchlist"
        description={session ? 'Synced to your signed-in wallet and saved on this device.' : 'Saved on this device. Sign in with a wallet to sync it to your account.'}
      />
      {mounted && items.length === 0 ? (
        <EmptyState icon={<Star className="h-5 w-5" />} title="Your watchlist is empty" description="Tap the star on any token to track it here." action={<ButtonLink href="/discover" variant="primary" size="sm">Explore markets</ButtonLink>} />
      ) : (
        <Card className="overflow-hidden">
          <TokenTable caption="Watchlist" tokens={loading && tokens.length === 0 ? undefined : tokens} loading={loading} columns={['token', 'price', 'change1h', 'change24h', 'volume', 'liquidity', 'marketCap', 'age']} showRank={false} emptyTitle="Couldn't load your watched tokens" emptyDescription="They may have been delisted. Try again later." />
        </Card>
      )}
      {missing > 0 && <p className="text-xs text-muted">{missing} watched {missing === 1 ? 'token' : 'tokens'} could not be loaded.</p>}
    </div>
  )
}
