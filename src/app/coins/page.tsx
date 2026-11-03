import type { Metadata } from 'next'
import { Suspense } from 'react'
import { MarketListView } from '@/features/market/MarketListView'
import { MarketListSkeleton } from '@/features/market/MarketListSkeleton'

export const metadata: Metadata = {
  title: 'Coins — Discovery Terminal',
  description: 'Screen coins dynamically across DEXes, chains, liquidity, volume, age, and buy/sell activity.',
  alternates: { canonical: '/coins' },
}

export default function CoinsPage() {
  return (
    <Suspense fallback={<MarketListSkeleton />}>
      <MarketListView
        list="all"
        title="Coins Terminal"
        description="Dynamic multi-chain discovery engine streaming tokens across Ethereum, Base, BNB, Solana, Arbitrum, Polygon, and Avalanche."
        columns={['token', 'price', 'change1h', 'change24h', 'volume', 'liquidity', 'marketCap', 'age', 'buyRatio']}
        initialSort={null}
      />
    </Suspense>
  )
}
