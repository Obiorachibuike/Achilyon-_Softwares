import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketListView } from '@/features/market/MarketListView'
import { MarketListSkeleton } from '@/features/market/MarketListSkeleton'

export const metadata: Metadata = {
  title: 'New pairs',
  description: 'Freshly created trading pools across supported DEXs, sorted by pool creation time.',
  alternates: { canonical: '/pairs' },
}

export default function Page() {
  return (
    <Suspense fallback={<MarketListSkeleton />}>
      <MarketListView list="pairs" title="New pairs" description="Freshly created trading pools across supported DEXs, sorted by pool creation time." columns={['token', 'dex', 'age', 'price', 'change1h', 'change24h', 'liquidity', 'volume', 'txns']} initialSort={null} />
    </Suspense>
  )
}
