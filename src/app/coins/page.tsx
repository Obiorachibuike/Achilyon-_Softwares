import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketListView } from '@/features/market/MarketListView'
import { MarketListSkeleton } from '@/features/market/MarketListSkeleton'

export const metadata: Metadata = {
  title: 'Coins Terminal',
  description: 'Real-time multi-chain coin discovery engine and trading terminal across major DEXes.',
  alternates: { canonical: '/coins' },
}

export default function CoinsPage() {
  return (
    <Suspense fallback={<MarketListSkeleton />}>
      <MarketListView
        list="all"
        title="Coins Terminal"
        description="Real-time multi-chain token discovery across DEXes, liquidity pools, and emerging markets."
        columns={['token', 'price', 'marketCap', 'liquidity', 'volume', 'age', 'buyRatio', 'trending']}
        initialSort={{ key: 'trending', dir: 'desc' }}
      />
    </Suspense>
  )
}
