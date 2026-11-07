import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketListView } from '@/features/market/MarketListView'
import { MarketListSkeleton } from '@/features/market/MarketListSkeleton'

export const metadata: Metadata = {
  title: 'Coins Terminal',
  description: 'Multi-chain discovery engine streaming tokens across Ethereum, Base, BNB, Solana, Arbitrum, Polygon, and Avalanche.',
  alternates: { canonical: '/coins' },
}

export default function Page() {
  return (
    <Suspense fallback={<MarketListSkeleton />}>
      <MarketListView
        list="all"
        title="Coins Terminal"
        description="Multi-chain discovery engine streaming tokens across Ethereum, Base, BNB, Solana, Arbitrum, Polygon, and Avalanche."
        columns={['token', 'price', 'marketCap', 'liquidity', 'volume', 'age', 'buyRatio', 'trending']}
        initialSort={null}
      />
    </Suspense>
  )
}
