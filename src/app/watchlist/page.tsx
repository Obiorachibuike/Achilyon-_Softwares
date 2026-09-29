import type { Metadata } from 'next'
import { WatchlistView } from '@/features/portfolio/WatchlistView'

export const metadata: Metadata = { title: 'Watchlist', robots: { index: false } }

export default function Page() {
  return <WatchlistView />
}
