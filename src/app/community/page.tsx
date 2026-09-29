import type { Metadata } from 'next'
import { CommunityView } from '@/features/community/CommunityView'

export const metadata: Metadata = {
  title: 'Community',
  description: 'Live trading activity and new launches across Achilyon.',
  alternates: { canonical: '/community' },
}

export default function Page() {
  return <CommunityView />
}
