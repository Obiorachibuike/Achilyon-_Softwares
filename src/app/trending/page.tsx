import type { Metadata } from 'next'
import { TrendingView } from '@/features/trending/TrendingView'

export const metadata: Metadata = {
  title: 'Trending tokens',
  description: 'Trending now, fastest growing, most discussed and newly viral tokens — ranked with transparent, explainable scores.',
  alternates: { canonical: '/trending' },
}

export default function Page() {
  return <TrendingView />
}
