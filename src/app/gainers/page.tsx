import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketListView } from '@/features/market/MarketListView'
import { MarketListSkeleton } from '@/features/market/MarketListSkeleton'

export const metadata: Metadata = {
  title: 'Top gainers',
  description: 'Biggest 24-hour price increases among markets with meaningful liquidity.',
  alternates: { canonical: '/gainers' },
}

export default function Page() {
  return (
    <Suspense fallback={<MarketListSkeleton />}>
      <MarketListView list="gainers" title="Top gainers" description="Biggest 24-hour price increases among markets with meaningful liquidity." columns={['token', 'price', 'change24h', 'change6h', 'change1h', 'volume', 'liquidity', 'marketCap']} initialSort={null} hideFilters={['changeDirection']} />
    </Suspense>
  )
}
