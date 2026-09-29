import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketListView } from '@/features/market/MarketListView'
import { MarketListSkeleton } from '@/features/market/MarketListSkeleton'

export const metadata: Metadata = {
  title: 'Discover markets',
  description: 'Screen every tracked market by network, liquidity, volume, age and momentum.',
  alternates: { canonical: '/discover' },
}

export default function Page() {
  return (
    <Suspense fallback={<MarketListSkeleton />}>
      <MarketListView list="all" title="Discover markets" description="Screen every tracked market by network, liquidity, volume, age and momentum." columns={['token', 'price', 'change1h', 'change6h', 'change24h', 'volume', 'liquidity', 'marketCap', 'txns', 'buyRatio', 'age']} initialSort={null} />
    </Suspense>
  )
}
