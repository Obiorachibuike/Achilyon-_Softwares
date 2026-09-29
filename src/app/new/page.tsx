import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketListView } from '@/features/market/MarketListView'
import { MarketListSkeleton } from '@/features/market/MarketListSkeleton'

export const metadata: Metadata = {
  title: 'New tokens',
  description: 'Tokens created in the last 7 days, newest first. New tokens are extremely risky — check liquidity and risk signals.',
  alternates: { canonical: '/new' },
}

export default function Page() {
  return (
    <Suspense fallback={<MarketListSkeleton />}>
      <MarketListView list="new" title="New tokens" description="Tokens created in the last 7 days, newest first. New tokens are extremely risky — check liquidity and risk signals." columns={['token', 'age', 'price', 'change1h', 'change24h', 'marketCap', 'volume', 'progress', 'creator']} initialSort={null} hideFilters={['maxAgeHours']} />
    </Suspense>
  )
}
