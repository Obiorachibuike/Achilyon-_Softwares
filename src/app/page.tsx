import type { Metadata } from 'next'
import { HomeView } from '@/features/home/HomeView'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

export default function HomePage() {
  return <HomeView />
}
