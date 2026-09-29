import type { Metadata } from 'next'
import { MyTokensView } from '@/features/profile/MyTokensView'

export const metadata: Metadata = { title: 'My tokens', robots: { index: false } }

export default function Page() {
  return <MyTokensView />
}
